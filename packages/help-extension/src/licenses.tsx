// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { SplitPanel, TabBar, Widget } from '@lumino/widgets';
import { ReadonlyJSONObject, PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

import { VirtualElement, h } from '@lumino/virtualdom';

import { ServerConnection } from '@jupyterlab/services';
import { TranslationBundle } from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import {
  spreadsheetIcon,
  jsonIcon,
  markdownIcon,
  LabIcon
} from '@jupyterlab/ui-components';

/**
 * A license viewer
 */
export class Licenses extends SplitPanel {
  readonly model: Licenses.Model;
  constructor(options: Licenses.IOptions) {
    super();
    this.addClass('jp-Licenses');
    this.model = options.model;
    this.initTabs();
    this.initGrid();
    this.initLicenseText();
    this.setRelativeSizes([1, 2, 3]);
    this.model.initLicenses().then(() => this._updateTabs());
  }

  /**
   * Handle disposing of the widget
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._tabs.currentChanged.disconnect(this.onBundleSelected, this);
    this.model.dispose();
    super.dispose();
  }

  /**
   * Initialize the listing of available bundles
   */
  protected initTabs() {
    this._tabs = new TabBar({
      orientation: 'vertical',
      renderer: new Licenses.BundleTabRenderer(this.model)
    });
    this._tabs.addClass('jp-Licenses-Bundles');
    this.addWidget(this._tabs);
    SplitPanel.setStretch(this._tabs, 1);
    this._tabs.currentChanged.connect(this.onBundleSelected, this);
  }

  /**
   * Initialize the listing of packages within the current bundle
   */
  protected initGrid() {
    this._grid = new Licenses.Grid(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._grid);
  }

  /**
   * Initialize the full text of the current package
   */
  protected initLicenseText() {
    this._text = new Licenses.FullText(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._text);
  }

  /**
   * Event handler for updating the model with the current bundle
   */
  protected onBundleSelected() {
    if (this._tabs.currentTitle?.label) {
      this.model.currentBundleName = this._tabs.currentTitle.label;
    }
  }

  /**
   * Update the bundle tabs.
   */
  protected _updateTabs(): void {
    this._tabs.clearTabs();
    let i = 0;
    for (const bundle of this.model.bundleNames) {
      const tab = new Widget();
      tab.title.label = bundle;
      this._tabs.insertTab(++i, tab.title);
    }
  }

  /**
   * Tabs reflecting available bundles
   */
  protected _tabs: TabBar<Widget>;

  /**
   * A grid of the current bundle's packages' license metadata
   */
  protected _grid: Licenses.Grid;

  /**
   * The currently-selected package's full license text
   */
  protected _text: Licenses.FullText;
}

/** A namespace for license components */
export namespace Licenses {
  /** The information about a license report format  */
  export interface IReportFormat {
    title: string;
    icon: LabIcon;
    id: string;
  }

  /**
   * License report formats understood by the server (once lower-cased)
   */
  export const REPORT_FORMATS: Record<string, IReportFormat> = {
    markdown: {
      id: 'markdown',
      title: 'Markdown',
      icon: markdownIcon
    },
    csv: {
      id: 'csv',
      title: 'CSV',
      icon: spreadsheetIcon
    },
    json: {
      id: 'csv',
      title: 'JSON',
      icon: jsonIcon
    }
  };

  /**
   * The default format (most human-readable)
   */
  export const DEFAULT_FORMAT = 'markdown';

  /**
   * Options for instantiating a license viewer
   */
  export interface IOptions {
    model: Model;
  }
  /**
   * Options for instantiating a license model
   */
  export interface IModelOptions {
    licensesUrl: string;
    serverSettings?: ServerConnection.ISettings;
    trans: TranslationBundle;
  }

  /**
   * The JSON response from the API
   */
  export interface ILicenseResponse {
    bundles: {
      [key: string]: ILicenseBundle;
    };
  }

  /**
   * A top-level report of the licenses for all code included in a bundle
   *
   * ### Note
   *
   * This is roughly informed by the terms defined in the SPDX spec, though is not
   * an SPDX Document, since there seem to be several (incompatible) specs
   * in that repo.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface ILicenseBundle extends ReadonlyJSONObject {
    packages: IPackageLicenseInfo[];
  }

  /**
   * A best-effort single bundled package's information.
   *
   * ### Note
   *
   * This is roughly informed by SPDX `packages` and `hasExtractedLicenseInfos`,
   * as making it conformant would vastly complicate the structure.
   *
   * @see https://github.com/spdx/spdx-spec/blob/development/v2.2.1/schemas/spdx-schema.json
   **/
  export interface IPackageLicenseInfo extends ReadonlyJSONObject {
    /**
     * the name of the package as it appears in package.json
     */
    name: string;
    /**
     * the version of the package, or an empty string if unknown
     */
    versionInfo: string;
    /**
     * an SPDX license identifier or LicenseRef, or an empty string if unknown
     */
    licenseId: string;
    /**
     * the verbatim extracted text of the license, or an empty string if unknown
     */
    extractedText: string;
  }

  /** The format information for a download */
  export interface IDownloadOptions {
    format: string;
  }

  /**
   * A model for license data
   */
  export class Model extends VDomModel {
    constructor(options: IModelOptions) {
      super();
      this._trans = options.trans;
      this._licensesUrl = options.licensesUrl;
      this._serverSettings =
        options.serverSettings || ServerConnection.makeSettings();
    }

    /**
     * Handle the initial request for the licenses from the server.
     */
    async initLicenses() {
      const response = await ServerConnection.makeRequest(
        this._licensesUrl,
        {},
        this._serverSettings
      );
      this._serverResponse = await response.json();
      this._licensesReady.resolve();
      this.stateChanged.emit(void 0);
    }

    /**
     * Create a temporary download link, and emulate clicking it to trigger a named
     * file download.
     */
    async download(options: IDownloadOptions) {
      const url = `${this._licensesUrl}?format=${options.format}&download=1`;
      const element = document.createElement('a');
      element.href = url;
      element.download = '';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      return void 0;
    }

    /**
     * A promise that resolves when the licenses from the server change
     */
    get selectedPackageChanged() {
      return this._selectedPackageChanged;
    }

    /**
     * The names of the license bundles available
     */
    get bundleNames(): string[] {
      return Object.keys(this._serverResponse?.bundles || {});
    }

    /**
     * The current license bundle
     */
    get currentBundleName() {
      if (this._currentBundleName) {
        return this._currentBundleName;
      }
      if (this.bundleNames.length) {
        return this.bundleNames[0];
      }
      return null;
    }

    /**
     * Set the current license bundle, and reset the selected index
     */
    set currentBundleName(currentBundleName: string | null) {
      if (this._currentBundleName !== currentBundleName) {
        this._currentBundleName = currentBundleName;
        this.selectedPackageIndex = null;
        this.stateChanged.emit(void 0);
      }
    }

    /**
     * A promise that resolves when the licenses are available from the server
     */
    get licensesReady(): Promise<void> {
      return this._licensesReady.promise;
    }

    /**
     * All the license bundles
     */
    get bundles() {
      return this._serverResponse?.bundles || {};
    }

    /**
     * The index of the currently-selected package within its license bundle
     */
    get selectedPackageIndex() {
      return this._selectedPackageIndex;
    }

    /**
     * Update the currently-selected package within its license bundle
     */
    set selectedPackageIndex(selectedPackageIndex: number | null) {
      if (this._selectedPackageIndex === selectedPackageIndex) {
        return;
      }
      this._selectedPackageIndex = selectedPackageIndex;
      if (
        this.currentBundleName &&
        this.bundles &&
        selectedPackageIndex != null
      ) {
        this._selectedPackage = this.bundles[this.currentBundleName].packages[
          selectedPackageIndex
        ];
      } else {
        this._selectedPackage = null;
      }
      this._selectedPackageChanged.emit(void 0);
      this.stateChanged.emit(void 0);
    }

    /**
     * The license data for the currently-selected package
     */
    get selectedPackage() {
      return this._selectedPackage;
    }

    /**
     * A translation bundle
     */
    get trans() {
      return this._trans;
    }

    private _selectedPackageChanged: Signal<Model, void> = new Signal(this);
    private _serverResponse: ILicenseResponse | null;
    private _licensesUrl: string;
    private _serverSettings: ServerConnection.ISettings;
    private _currentBundleName: string | null;
    private _trans: TranslationBundle;
    private _selectedPackageIndex: number | null;
    private _selectedPackage: IPackageLicenseInfo | null;
    private _licensesReady = new PromiseDelegate<void>();
  }

  /**
   * A fancy bundle renderer with the package count
   */
  export class BundleTabRenderer extends TabBar.Renderer {
    /**
     * A model of the state of license viewing as well as the underlying data
     */
    model: Model;

    readonly closeIconSelector = '.lm-TabBar-tabCloseIcon';

    constructor(model: Model) {
      super();
      this.model = model;
    }

    /**
     * Render a full bundle
     */
    renderTab(data: TabBar.IRenderData<Widget>): VirtualElement {
      let title = data.title.caption;
      let key = this.createTabKey(data);
      let style = this.createTabStyle(data);
      let className = this.createTabClass(data);
      let dataset = this.createTabDataset(data);
      return h.li(
        { key, className, title, style, dataset },
        this.renderIcon(data),
        this.renderLabel(data),
        this.renderCountBadge(data)
      );
    }

    /**
     * Render the package count
     */
    renderCountBadge(data: TabBar.IRenderData<Widget>): VirtualElement {
      const bundle = data.title.label;
      const { bundles } = this.model;
      const packages =
        (bundles && bundle ? bundles[bundle].packages : []) || [];
      return h.label({}, `${packages.length}`);
    }
  }

  /**
   * A grid of licenses
   */
  export class Grid extends VDomRenderer<Licenses.Model> {
    constructor(model: Licenses.Model) {
      super(model);
      this.addClass('jp-Licenses-Grid');
      this.addClass('jp-RenderedHTMLCommon');
    }

    /**
     * Render a grid of package license information
     */
    protected render(): JSX.Element {
      const { bundles, currentBundleName } = this.model;
      const data =
        bundles && currentBundleName
          ? bundles[currentBundleName]?.packages
          : [];

      return (
        <form>
          <table>
            <thead>
              <tr>
                <td></td>
                <th>{this.model.trans.__('Package')}</th>
                <th>{this.model.trans.__('Version')}</th>
                <th>{this.model.trans.__('License ID')}</th>
              </tr>
            </thead>
            <tbody>{data.map(this.renderRow)}</tbody>
          </table>
        </form>
      );
    }

    /**
     * Render a single package's license information
     */
    protected renderRow = (
      row: Licenses.IPackageLicenseInfo,
      index: number
    ) => {
      const selected = index === this.model.selectedPackageIndex;
      const onCheck = () => (this.model.selectedPackageIndex = index);
      return (
        <tr
          key={row.name}
          className={selected ? 'jp-mod-selected' : ''}
          onClick={onCheck}
        >
          <td>
            <input
              type="radio"
              name="show-package-license"
              value={index}
              onChange={onCheck}
              checked={selected}
            />
          </td>
          <th>{row.name}</th>
          <td>
            <code>{row.versionInfo}</code>
          </td>
          <td>
            <code>{row.licenseId}</code>
          </td>
        </tr>
      );
    };
  }

  /**
   * A package's full license text
   */
  export class FullText extends VDomRenderer<Model> {
    constructor(model: Model) {
      super(model);
      this.addClass('jp-Licenses-Text');
      this.addClass('jp-RenderedHTMLCommon');
      this.addClass('jp-RenderedMarkdown');
    }

    /**
     * Render the license text, or a null state if no package is selected
     */
    protected render() {
      const { selectedPackage, trans } = this.model;
      let head = '';
      let quote = trans.__('No Package selected');
      let code = '';
      if (selectedPackage) {
        const { name, versionInfo, licenseId, extractedText } = selectedPackage;
        head = `${name} v${versionInfo}`;
        quote = `${trans.__('License ID')}: ${
          licenseId || trans.__('No License ID found')
        }`;
        code = extractedText || trans.__('No License Text found');
      }
      return [
        <h1>{head}</h1>,
        <blockquote>{quote}</blockquote>,
        <code>{code}</code>
      ];
    }
  }
}
