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
  protected readonly model: Licenses.Model;
  constructor(options: Licenses.IOptions) {
    super();
    this.addClass('jp-Licenses');
    this.model = options.model;
    this.initTabs();
    this.initGrid();
    this.initLicenseText();
    this.setRelativeSizes([1, 2, 3]);
    this.model.stateChanged.connect(this.onLicensesChanged, this);
    void this.model.initLicenses();
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._tabs.currentChanged.disconnect(this.onBundleSelected, this);
    this.model.stateChanged.disconnect(this.onLicensesChanged, this);
    this.model.dispose();
    super.dispose();
  }

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

  protected initGrid() {
    this._grid = new LicenseGrid(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._grid);
  }

  protected initLicenseText() {
    this._text = new Licenses.LicenseText(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._text);
  }

  protected onBundleSelected() {
    if (this._tabs.currentTitle?.label) {
      this.model.bundle = this._tabs.currentTitle.label;
    }
  }

  protected onLicensesChanged() {
    this._updateTabs();
  }

  protected _updateTabs(): void {
    this._tabs.clearTabs();
    let i = 0;
    for (const bundle of this.model.bundles) {
      const tab = new Widget();
      tab.title.label = bundle;
      this._tabs.insertTab(++i, tab.title);
    }
  }

  protected _grid: LicenseGrid;
  protected _tabs: TabBar<Widget>;
  protected _text: Widget;
}

export class LicenseGrid extends VDomRenderer<Licenses.Model> {
  constructor(model: Licenses.Model) {
    super(model);
    this.addClass('jp-Licenses-Grid');
    this.addClass('jp-RenderedHTMLCommon');
  }
  protected render(): JSX.Element {
    const licenses = this.model.licenses;
    const bundle = this.model.bundle;
    const data = licenses && bundle ? licenses[bundle]?.packages : [];

    return (
      <form>
        <table>
          <thead>
            <tr>
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

  protected renderRow = (row: Licenses.IPackageLicenseInfo, index: number) => {
    const id = `id-license-package-${index}`;
    return (
      <tr key={row.name}>
        <th>
          <label htmlFor={id}>
            <input
              type="radio"
              name="show-package-license"
              value={index}
              id={id}
              onChange={this.onPackageSelected}
            />
            <code>{row.name}</code>
          </label>
        </th>
        <td>
          <code>{row.versionInfo}</code>
        </td>
        <td>
          <code>{row.licenseId}</code>
        </td>
      </tr>
    );
  };

  protected onPackageSelected = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.model.selectedPackageIndex = parseInt(evt.currentTarget.value);
  };
}

export namespace Licenses {
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
    [key: string]: ILicenseReport;
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
  export interface ILicenseReport extends ReadonlyJSONObject {
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
    /** the name of the package as it appears in node_modules */
    name: string;
    /** the version of the package, or an empty string if unknown */
    versionInfo: string;
    /** an SPDX license or LicenseRef, or an empty string if unknown */
    licenseId: string;
    /** the verbatim extracted text of the license, or an empty string if unknown */
    extractedText: string;
  }

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

    async initLicenses() {
      const response = await ServerConnection.makeRequest(
        this._licensesUrl,
        {},
        this._serverSettings
      );
      this._licenses = await response.json();
      this._licensesReady.resolve(void 0);
      this._licensesChanged.emit(void 0);
      this.stateChanged.emit(void 0);
    }

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

    get licensesChanged() {
      return this._licensesChanged;
    }

    get selectedPackageChanged() {
      return this._selectedPackageChanged;
    }

    get bundles(): string[] {
      if (this._licenses) {
        return Object.keys(this._licenses);
      }
      return [];
    }

    get bundle() {
      if (this._bundle) {
        return this._bundle;
      }
      if (this.bundles.length) {
        return this.bundles[0];
      }
      return null;
    }

    set bundle(bundle: string | null) {
      this._bundle = bundle;
      this.selectedPackageIndex = null;
    }

    get licenses() {
      return this._licenses;
    }

    get selectedPackageIndex() {
      return this._selectedPackageIndex;
    }

    set selectedPackageIndex(selectedPackageIndex: number | null) {
      this._selectedPackageIndex = selectedPackageIndex;
      if (this.bundle && this.licenses && selectedPackageIndex != null) {
        this._selectedPackage = this.licenses[this.bundle].packages[
          selectedPackageIndex
        ];
      } else {
        this._selectedPackage = null;
      }
      this._selectedPackageChanged.emit(void 0);
      this.stateChanged.emit(void 0);
    }

    get selectedPackage() {
      return this._selectedPackage;
    }

    get licensesReady() {
      return this._licensesReady.promise;
    }

    get trans() {
      return this._trans;
    }

    private _licensesChanged: Signal<Model, void> = new Signal(this);
    private _selectedPackageChanged: Signal<Model, void> = new Signal(this);
    private _licenses: ILicenseResponse | null;
    private _licensesUrl: string;
    private _serverSettings: ServerConnection.ISettings;
    private _bundle: string | null;
    private _trans: TranslationBundle;
    private _licensesReady = new PromiseDelegate<void>();
    private _selectedPackageIndex: number | null;
    private _selectedPackage: IPackageLicenseInfo | null;
  }

  export class BundleTabRenderer extends TabBar.Renderer {
    model: Model;

    readonly closeIconSelector = '.lm-TabBar-tabCloseIcon';
    constructor(model: Model) {
      super();
      this.model = model;
    }
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

    renderCountBadge(data: TabBar.IRenderData<Widget>): VirtualElement {
      const bundle = data.title.label;
      const { licenses } = this.model;
      const packages =
        (licenses && bundle ? licenses[bundle].packages : []) || [];
      return h.label({}, `${packages.length}`);
    }
  }

  export class LicenseText extends Widget {
    private model: Model;

    constructor(model: Model) {
      super();
      this.model = model;
      this.addClass('jp-Licenses-Text');
      this.addClass('jp-RenderedHTMLCommon');
      this.addClass('jp-RenderedMarkdown');

      this._head = document.createElement('h1');
      this.node.appendChild(this._head);

      this._quote = document.createElement('blockquote');
      this.node.appendChild(this._quote);

      this._code = document.createElement('code');
      this.node.appendChild(this._code);

      this.model.selectedPackageChanged.connect(
        this.onSelectedPackageChanged,
        this
      );

      this.onSelectedPackageChanged();
    }

    dispose() {
      super.dispose();
      if (this.isDisposed) {
        return;
      }
      this.model.selectedPackageChanged.disconnect(
        this.onSelectedPackageChanged,
        this
      );
    }

    protected onSelectedPackageChanged() {
      const { selectedPackage, trans } = this.model;
      if (selectedPackage != null) {
        const { name, versionInfo, licenseId, extractedText } = selectedPackage;
        this._head.textContent = `${name} v${versionInfo}`;
        this._quote.textContent = `${trans.__('License ID')}: ${
          licenseId || trans.__('No License ID found')
        }`;
        this._code.textContent =
          extractedText || trans.__('No License Text found');
      } else {
        this._head.textContent = '';
        this._quote.textContent = trans.__('No Package selected');
        this._code.textContent = '';
      }
    }

    private _head: HTMLElement;
    private _code: HTMLElement;
    private _quote: HTMLElement;
  }
}
