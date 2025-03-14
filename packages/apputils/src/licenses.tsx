// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '@jupyterlab/services';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  jsonIcon,
  LabIcon,
  markdownIcon,
  spreadsheetIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import { PromiseDelegate, ReadonlyJSONObject } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { h, VirtualElement } from '@lumino/virtualdom';
import { Panel, SplitPanel, TabBar, Widget } from '@lumino/widgets';
import * as React from 'react';
import { ILicensesClient } from './tokens';

const FILTER_SECTION_TITLE_CLASS = 'jp-Licenses-Filters-title';

/**
 * A license viewer
 */
export class Licenses extends SplitPanel {
  readonly model: Licenses.Model;

  constructor(options: Licenses.IOptions) {
    super();
    this.addClass('jp-Licenses');
    this.model = options.model;
    this.initLeftPanel();
    this.initFilters();
    this.initBundles();
    this.initGrid();
    this.initLicenseText();
    this.setRelativeSizes([1, 2, 3]);
    void this.model.initLicenses().then(() => this._updateBundles());
    this.model.trackerDataChanged.connect(() => {
      this.title.label = this.model.title;
    });
  }

  /**
   * Handle disposing of the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._bundles.currentChanged.disconnect(this.onBundleSelected, this);
    this.model.dispose();
    super.dispose();
  }

  /**
   * Initialize the left area for filters and bundles
   */
  protected initLeftPanel(): void {
    this._leftPanel = new Panel();
    this._leftPanel.addClass('jp-Licenses-FormArea');
    this.addWidget(this._leftPanel);
    SplitPanel.setStretch(this._leftPanel, 1);
  }

  /**
   * Initialize the filters
   */
  protected initFilters(): void {
    this._filters = new Licenses.Filters(this.model);
    SplitPanel.setStretch(this._filters, 1);
    this._leftPanel.addWidget(this._filters);
  }

  /**
   * Initialize the listing of available bundles
   */
  protected initBundles(): void {
    this._bundles = new TabBar({
      orientation: 'vertical',
      renderer: new Licenses.BundleTabRenderer(this.model)
    });
    this._bundles.addClass('jp-Licenses-Bundles');
    SplitPanel.setStretch(this._bundles, 1);
    this._leftPanel.addWidget(this._bundles);
    this._bundles.currentChanged.connect(this.onBundleSelected, this);
    this.model.stateChanged.connect(() => this._bundles.update());
  }

  /**
   * Initialize the listing of packages within the current bundle
   */
  protected initGrid(): void {
    this._grid = new Licenses.Grid(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._grid);
  }

  /**
   * Initialize the full text of the current package
   */
  protected initLicenseText(): void {
    this._licenseText = new Licenses.FullText(this.model);
    SplitPanel.setStretch(this._grid, 1);
    this.addWidget(this._licenseText);
  }

  /**
   * Event handler for updating the model with the current bundle
   */
  protected onBundleSelected(): void {
    if (this._bundles.currentTitle?.label) {
      this.model.currentBundleName = this._bundles.currentTitle.label;
    }
  }

  /**
   * Update the bundle tabs.
   */
  protected _updateBundles(): void {
    this._bundles.clearTabs();
    let i = 0;
    const { currentBundleName } = this.model;
    let currentIndex = 0;
    for (const bundle of this.model.bundleNames) {
      const tab = new Widget();
      tab.title.label = bundle;
      if (bundle === currentBundleName) {
        currentIndex = i;
      }
      this._bundles.insertTab(++i, tab.title);
    }
    this._bundles.currentIndex = currentIndex;
  }

  /**
   * An area for selecting licenses by bundle and filters
   */
  protected _leftPanel: Panel;

  /**
   * Filters on visible licenses
   */
  protected _filters: Licenses.Filters;

  /**
   * Tabs reflecting available bundles
   */
  protected _bundles: TabBar<Widget>;

  /**
   * A grid of the current bundle's packages' license metadata
   */
  protected _grid: Licenses.Grid;

  /**
   * The currently-selected package's full license text
   */
  protected _licenseText: Licenses.FullText;
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
      id: 'json',
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
  export interface IModelOptions extends ICreateArgs {
    client: ILicensesClient;
    trans: TranslationBundle;
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

  /**
   * The format information for a download
   */
  export interface IDownloadOptions {
    format: string;
  }

  /**
   * The fields which can be filtered
   */
  export type TFilterKey = 'name' | 'versionInfo' | 'licenseId';

  export interface ICreateArgs {
    currentBundleName?: string | null;
    packageFilter?: Partial<IPackageLicenseInfo> | null;
    currentPackageIndex?: number | null;
  }

  /**
   * The options for a new license client.
   */
  export interface ILicenseClientOptions {
    /**
     * The URL for the licenses API
     */
    licensesUrl?: string;

    /**
     * The server settings
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The JSON response from the API
   */
  export interface ILicenseResponse {
    bundles: {
      [key: string]: Licenses.ILicenseBundle;
    };
  }

  /**
   * A class used for fetching licenses from the server.
   */
  export class LicensesClient implements ILicensesClient {
    /**
     * Create a new license client.
     */
    constructor(options: ILicenseClientOptions = {}) {
      this._licensesUrl = options.licensesUrl || '';
      this._serverSettings =
        options.serverSettings ?? ServerConnection.makeSettings();
    }

    /**
     * Download the licenses in the requested format.
     */
    async download(options: IDownloadOptions): Promise<void> {
      const url = `${this._licensesUrl}?format=${options.format}&download=1`;
      const element = document.createElement('a');
      element.href = url;
      element.download = '';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
      return void 0;
    }

    /**
     * Fetch the license bundles from the server.
     */
    async getBundles(): Promise<ILicenseResponse> {
      const response = await ServerConnection.makeRequest(
        this._licensesUrl,
        {},
        this._serverSettings
      );
      return response.json();
    }

    private _serverSettings: ServerConnection.ISettings;
    private _licensesUrl: string;
  }

  /**
   * A model for license data
   */
  export class Model extends VDomModel implements ICreateArgs {
    constructor(options: IModelOptions) {
      super();
      this._trans = options.trans;
      this._client = options.client;
      if (options.currentBundleName) {
        this._currentBundleName = options.currentBundleName;
      }
      if (options.packageFilter) {
        this._packageFilter = options.packageFilter;
      }
      if (options.currentPackageIndex) {
        this._currentPackageIndex = options.currentPackageIndex;
      }
    }

    /**
     * Handle the initial request for the licenses from the server.
     */
    async initLicenses(): Promise<void> {
      try {
        this._serverResponse = await this._client.getBundles();
        this._licensesReady.resolve();
        this.stateChanged.emit(void 0);
      } catch (err) {
        this._licensesReady.reject(err);
      }
    }

    /**
     * Download the licenses in the requested format.
     */
    async download(options: IDownloadOptions): Promise<void> {
      return this._client.download(options);
    }

    /**
     * A promise that resolves when the licenses from the server change
     */
    get selectedPackageChanged(): ISignal<Model, void> {
      return this._selectedPackageChanged;
    }

    /**
     * A promise that resolves when the trackable data changes
     */
    get trackerDataChanged(): ISignal<Model, void> {
      return this._trackerDataChanged;
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
    get currentBundleName(): string | null {
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
        this.stateChanged.emit(void 0);
        this._trackerDataChanged.emit(void 0);
      }
    }

    /**
     * A promise that resolves when the licenses are available from the server
     */
    get licensesReady(): Promise<void> {
      return this._licensesReady.promise;
    }

    /**
     * All the license bundles, keyed by the distributing packages
     */
    get bundles(): null | { [key: string]: ILicenseBundle } {
      return this._serverResponse?.bundles || {};
    }

    /**
     * The index of the currently-selected package within its license bundle
     */
    get currentPackageIndex(): number | null {
      return this._currentPackageIndex;
    }

    /**
     * Update the currently-selected package within its license bundle
     */
    set currentPackageIndex(currentPackageIndex: number | null) {
      if (this._currentPackageIndex === currentPackageIndex) {
        return;
      }
      this._currentPackageIndex = currentPackageIndex;
      this._selectedPackageChanged.emit(void 0);
      this.stateChanged.emit(void 0);
      this._trackerDataChanged.emit(void 0);
    }

    /**
     * The license data for the currently-selected package
     */
    get currentPackage(): IPackageLicenseInfo | null {
      if (
        this.currentBundleName &&
        this.bundles &&
        this._currentPackageIndex != null
      ) {
        return this.getFilteredPackages(
          this.bundles[this.currentBundleName]?.packages || []
        )[this._currentPackageIndex];
      }

      return null;
    }

    /**
     * A translation bundle
     */
    get trans(): TranslationBundle {
      return this._trans;
    }

    get title(): string {
      return `${this._currentBundleName || ''} ${this._trans.__(
        'Licenses'
      )}`.trim();
    }

    /**
     * The current package filter
     */
    get packageFilter(): Partial<IPackageLicenseInfo> {
      return this._packageFilter;
    }

    set packageFilter(packageFilter: Partial<IPackageLicenseInfo>) {
      this._packageFilter = packageFilter;
      this.stateChanged.emit(void 0);
      this._trackerDataChanged.emit(void 0);
    }

    /**
     * Get filtered packages from current bundle where at least one token of each
     * key is present.
     */
    getFilteredPackages(allRows: IPackageLicenseInfo[]): IPackageLicenseInfo[] {
      let rows: IPackageLicenseInfo[] = [];
      let filters: [string, string[]][] = Object.entries(this._packageFilter)
        .filter(([k, v]) => v && `${v}`.trim().length)
        .map(([k, v]) => [k, `${v}`.toLowerCase().trim().split(' ')]);
      for (const row of allRows) {
        let keyHits = 0;
        for (const [key, bits] of filters) {
          let bitHits = 0;
          let rowKeyValue = `${row[key]}`.toLowerCase();
          for (const bit of bits) {
            if (rowKeyValue.includes(bit)) {
              bitHits += 1;
            }
          }
          if (bitHits) {
            keyHits += 1;
          }
        }
        if (keyHits === filters.length) {
          rows.push(row);
        }
      }
      return Object.values(rows);
    }

    private _selectedPackageChanged: Signal<Model, void> = new Signal(this);
    private _trackerDataChanged: Signal<Model, void> = new Signal(this);
    private _serverResponse: ILicenseResponse | null;
    private _client: ILicensesClient;
    private _currentBundleName: string | null;
    private _trans: TranslationBundle;
    private _currentPackageIndex: number | null = 0;
    private _licensesReady = new PromiseDelegate<void>();
    private _packageFilter: Partial<IPackageLicenseInfo> = {};
  }

  /**
   * A filter form for limiting the packages displayed
   */
  export class Filters extends VDomRenderer<Model> {
    constructor(model: Model) {
      super(model);
      this.addClass('jp-Licenses-Filters');
      this.addClass('jp-RenderedHTMLCommon');
    }

    protected render(): JSX.Element {
      const { trans } = this.model;
      return (
        <div>
          <label>
            <strong className={FILTER_SECTION_TITLE_CLASS}>
              {trans.__('Filter Licenses By')}
            </strong>
          </label>
          <ul>
            <li>
              <label>{trans.__('Package')}</label>
              {this.renderFilter('name')}
            </li>
            <li>
              <label>{trans.__('Version')}</label>
              {this.renderFilter('versionInfo')}
            </li>
            <li>
              <label>{trans.__('License')}</label>
              {this.renderFilter('licenseId')}
            </li>
          </ul>
          <label>
            <strong className={FILTER_SECTION_TITLE_CLASS}>
              {trans.__('Distributions')}
            </strong>
          </label>
        </div>
      );
    }

    /**
     * Render a filter input
     */
    protected renderFilter = (key: TFilterKey): JSX.Element => {
      const value = this.model.packageFilter[key] || '';
      return (
        <input
          type="text"
          name={key}
          defaultValue={value}
          className="jp-mod-styled"
          onInput={this.onFilterInput}
        />
      );
    };

    /**
     * Handle a filter input changing
     */
    protected onFilterInput = (
      evt: React.ChangeEvent<HTMLInputElement>
    ): void => {
      const input = evt.currentTarget;
      const { name, value } = input;
      this.model.packageFilter = { ...this.model.packageFilter, [name]: value };
    };
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
      const packages = this.model.getFilteredPackages(
        (bundles && bundle ? bundles[bundle].packages : []) || []
      );
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
      const { bundles, currentBundleName, trans } = this.model;
      const filteredPackages = this.model.getFilteredPackages(
        bundles && currentBundleName
          ? bundles[currentBundleName]?.packages || []
          : []
      );
      if (!filteredPackages.length) {
        return (
          <blockquote>
            <em>{trans.__('No Packages found')}</em>
          </blockquote>
        );
      }
      return (
        <form>
          <table>
            <thead>
              <tr>
                <td></td>
                <th>{trans.__('Package')}</th>
                <th>{trans.__('Version')}</th>
                <th>{trans.__('License')}</th>
              </tr>
            </thead>
            <tbody>{filteredPackages.map(this.renderRow)}</tbody>
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
    ): JSX.Element => {
      const selected = index === this.model.currentPackageIndex;
      const onCheck = () => (this.model.currentPackageIndex = index);
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
    protected render(): JSX.Element[] {
      const { currentPackage, trans } = this.model;
      let head = '';
      let quote = trans.__('No Package selected');
      let code = '';
      if (currentPackage) {
        const { name, versionInfo, licenseId, extractedText } = currentPackage;
        head = `${name} v${versionInfo}`;
        quote = `${trans.__('License')}: ${
          licenseId || trans.__('No License ID found')
        }`;
        code = extractedText || trans.__('No License Text found');
      }
      return [
        <h1 key="h1">{head}</h1>,
        <blockquote key="quote">
          <em>{quote}</em>
        </blockquote>,
        <code key="code">{code}</code>
      ];
    }
  }
}
