// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/apputils';

import {
  KernelSpec,
  ServerConnection,
  ServiceManager
} from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { Debouncer } from '@lumino/polling';

import * as semver from 'semver';

import { doBuild } from './build-helper';

import {
  presentCompanions,
  IKernelInstallInfo,
  KernelCompanion
} from './companions';

import { reportInstallError } from './dialog';

import { Searcher, ISearchResult, isJupyterOrg } from './npm';

import { Lister, ListResult, IListEntry } from './listings';

/**
 * Information about an extension.
 */
export interface IEntry {
  /**
   * The name of the extension.
   */
  name: string;

  /**
   * A short description of the extension.
   */
  description: string;

  /**
   * A representative link of the package.
   */
  url: string;

  /**
   * Whether the extension is currently installed.
   */
  installed: boolean;

  /**
   * Whether the extension is currently enabled.
   */
  enabled: boolean;

  /**
   * A flag indicating the status of an installed extension.
   */
  status: 'ok' | 'warning' | 'error' | 'deprecated' | null;

  /**
   * The latest version of the extension.
   */
  latest_version: string;

  /**
   * The installed version of the extension.
   */
  installed_version: string;

  blacklistEntry: IListEntry | undefined;

  whitelistEntry: IListEntry | undefined;
}

/**
 * Wire format for installed extensions.
 */
export interface IInstalledEntry {
  /**
   * The name of the extension.
   */
  name: string;

  /**
   * A short description of the extension.
   */
  description: string;

  /**
   * A representative link of the package.
   */
  url: string;

  /**
   * Whether the extension is currently installed.
   */
  installed?: boolean;

  /**
   * Whether the extension is currently enabled.
   */
  enabled: boolean;

  /**
   * The latest version of the extension.
   */
  latest_version: string;

  /**
   * The installed version of the extension.
   */
  installed_version: string;

  /**
   * A flag indicating the status of an installed extension.
   */
  status: 'ok' | 'warning' | 'error' | 'deprecated' | null;
}

/**
 * An object representing a server reply to performing an action.
 */
export interface IActionReply {
  /**
   * The status category of the reply.
   */
  status: 'ok' | 'warning' | 'error' | null;

  /**
   * An optional message when the status is not 'ok'.
   */
  message?: string;
}

/**
 * The server API path for querying/modifying installed extensions.
 */
const EXTENSION_API_PATH = 'lab/api/extensions';

/**
 * Extension actions that the server API accepts
 */
export type Action = 'install' | 'uninstall' | 'enable' | 'disable';

/**
 * Model for an extension list.
 */
export class ListModel extends VDomModel {
  constructor(
    serviceManager: ServiceManager,
    settings: ISettingRegistry.ISettings
  ) {
    super();
    this._installed = [];
    this._searchResult = [];
    this.serviceManager = serviceManager;
    this.serverConnectionSettings = ServerConnection.makeSettings();
    this._debouncedUpdate = new Debouncer(this.update.bind(this), 1000);
    this.lister.listingsLoaded.connect(this._listingIsLoaded, this);
    _isDisclaimed = settings.composite['disclaimed'] === true;
    settings.changed.connect(() => {
      _isDisclaimed = settings.composite['disclaimed'] === true;
      void this.update();
    });
  }

  private _listingIsLoaded(_: Lister, listings: ListResult) {
    this._listMode = listings!.mode;
    this._blacklistArray = new Array<IListEntry>();
    if (this._listMode === 'black') {
      listings!.entries.map(e => {
        this._blacklistArray.push({
          name: e.name,
          regexp: new RegExp(e.name),
          type: e.type,
          reason: e.reason,
          creation_date: e.creation_date,
          last_update_date: e.last_update_date
        });
      });
    }
    this._whitelistArray = new Array<IListEntry>();
    if (this._listMode === 'white') {
      listings!.entries.map(e => {
        this._whitelistArray.push({
          name: e.name,
          regexp: new RegExp(e.name),
          type: e.type,
          reason: e.reason,
          creation_date: e.creation_date,
          last_update_date: e.last_update_date
        });
      });
    }
    void this.initialize();
  }

  /**
   * A readonly array of the installed extensions.
   */
  get installed(): ReadonlyArray<IEntry> {
    return this._installed;
  }

  /**
   * A readonly array containing the latest search result
   */
  get searchResult(): ReadonlyArray<IEntry> {
    return this._searchResult;
  }

  /**
   * The current NPM repository search query.
   *
   * Setting its value triggers a new search.
   */
  get query(): string | null {
    return this._query;
  }
  set query(value: string | null) {
    this._query = value;
    void this._debouncedUpdate.invoke();
  }

  /**
   * The current NPM repository search page.
   *
   * The npm repository search is paginated by the `pagination` attribute.
   * The `page` value selects which page is used.
   *
   * Setting its value triggers a new search.
   */
  get page(): number {
    return this._page;
  }
  set page(value: number) {
    this._page = value;
    void this.update();
  }

  /**
   * The NPM repository search pagination.
   *
   * The npm repository search is paginated by the `pagination` attribute.
   * The `page` value selects which page is used.
   *
   * Setting its value triggers a new search.
   */
  get pagination(): number {
    return this._pagination;
  }
  set pagination(value: number) {
    this._pagination = value;
    void this.update();
  }

  /**
   * The total number of results in the current search.
   */
  get totalEntries(): number {
    return this._totalEntries;
  }

  /**
   * The list mode.
   */
  get listMode(): 'black' | 'white' | 'default' | 'invalid' {
    return this._listMode;
  }

  /**
   * The total number of blacklisted results in the current search.
   */
  get totalBlacklistedFound(): number {
    return this._totalBlacklistedFound;
  }

  /**
   * The total number of whitelisted results in the current search.
   */
  get totalWhitelistedFound(): number {
    return this._totalWhitelistedFound;
  }

  /**
   * Initialize the model.
   */
  initialize(): Promise<void> {
    return this.update()
      .then(() => {
        this.initialized = true;
        this.stateChanged.emit(undefined);
      })
      .catch(() => {
        this.initialized = true;
        this.stateChanged.emit(undefined);
      });
  }

  /**
   * Whether there are currently any actions pending.
   */
  hasPendingActions(): boolean {
    return this._pendingActions.length > 0;
  }

  /**
   * Install an extension.
   *
   * @param entry An entry indicating which extension to install.
   */
  async install(entry: IEntry): Promise<void> {
    if (entry.installed) {
      // Updating
      await this._performAction('install', entry).then(data => {
        if (data.status !== 'ok') {
          reportInstallError(entry.name, data.message);
        }
        return this.update();
      });
    }
    await this.checkCompanionPackages(entry).then(shouldInstall => {
      if (shouldInstall) {
        return this._performAction('install', entry).then(data => {
          if (data.status !== 'ok') {
            reportInstallError(entry.name, data.message);
          }
          return this.update();
        });
      }
    });
  }

  /**
   * Uninstall an extension.
   *
   * @param entry An entry indicating which extension to uninstall.
   */
  async uninstall(entry: IEntry): Promise<void> {
    if (!entry.installed) {
      throw new Error(`Not installed, cannot uninstall: ${entry.name}`);
    }
    await this._performAction('uninstall', entry);
    return this.update();
  }

  /**
   * Enable an extension.
   *
   * @param entry An entry indicating which extension to enable.
   */
  async enable(entry: IEntry): Promise<void> {
    if (entry.enabled) {
      throw new Error(`Already enabled: ${entry.name}`);
    }
    await this._performAction('enable', entry);
    await this.update();
  }

  /**
   * Disable an extension.
   *
   * @param entry An entry indicating which extension to disable.
   */
  async disable(entry: IEntry): Promise<void> {
    if (!entry.enabled) {
      throw new Error(`Already disabled: ${entry.name}`);
    }
    await this._performAction('disable', entry);
    await this.update();
  }

  /**
   * Check for companion packages in kernels or server.
   *
   * @param entry An entry indicating which extension to check.
   */
  checkCompanionPackages(entry: IEntry): Promise<boolean> {
    return this.searcher
      .fetchPackageData(entry.name, entry.latest_version)
      .then(data => {
        if (!data || !data.jupyterlab || !data.jupyterlab.discovery) {
          return true;
        }
        const discovery = data.jupyterlab.discovery;
        const kernelCompanions: KernelCompanion[] = [];
        if (discovery.kernel) {
          // match specs
          for (const kernelInfo of discovery.kernel) {
            const matches = Private.matchSpecs(
              kernelInfo,
              this.serviceManager.kernelspecs.specs
            );
            kernelCompanions.push({ kernelInfo, kernels: matches });
          }
        }
        if (kernelCompanions.length < 1 && !discovery.server) {
          return true;
        }
        return presentCompanions(kernelCompanions, discovery.server);
      });
  }

  /**
   * Trigger a build check to incorporate actions taken.
   */
  triggerBuildCheck(): void {
    const builder = this.serviceManager.builder;
    if (builder.isAvailable && !this.promptBuild) {
      const completed = builder.getStatus().then(response => {
        if (response.status === 'building') {
          // Piggy-back onto existing build
          // TODO: Can this cause dialog collision on build completion?
          return doBuild(builder);
        }
        if (response.status !== 'needed') {
          return;
        }
        if (!this.promptBuild) {
          this.promptBuild = true;
          this.stateChanged.emit(undefined);
        }
      });
      this._addPendingAction(completed);
    }
  }

  /**
   * Perform a build on the server
   */
  performBuild(): void {
    if (this.promptBuild) {
      this.promptBuild = false;
      this.stateChanged.emit(undefined);
    }
    const completed = doBuild(this.serviceManager.builder);
    this._addPendingAction(completed);
  }

  /**
   * Ignore a build recommendation
   */
  ignoreBuildRecommendation(): void {
    if (this.promptBuild) {
      this.promptBuild = false;
      this.stateChanged.emit(undefined);
    }
  }

  /**
   * Ignore a build recommendation
   */
  refreshInstalled(): void {
    const refresh = this.update(true);
    this._addPendingAction(refresh);
  }

  /**
   * Translate search results from an npm repository query into entries
   * and remove entries with 'deprecated' in the keyword list
   *
   * @param res Promise to an npm query result.
   */
  protected async translateSearchResult(
    res: Promise<ISearchResult>
  ): Promise<{ [key: string]: IEntry }> {
    const entries: { [key: string]: IEntry } = {};
    this._totalBlacklistedFound = 0;
    this._totalWhitelistedFound = 0;
    this._totalEntries = 0;
    for (const obj of (await res).objects) {
      const pkg = obj.package;
      if (pkg.keywords.indexOf('deprecated') >= 0) {
        continue;
      }
      this._totalEntries = this._totalEntries + 1;
      const isBlacklisted = this.isListed(pkg.name, this._blacklistArray);
      if (isBlacklisted) {
        this._totalBlacklistedFound = this._totalBlacklistedFound + 1;
      }
      const isWhitelisted = this.isListed(pkg.name, this._whitelistArray);
      if (isWhitelisted) {
        this._totalWhitelistedFound = this._totalWhitelistedFound + 1;
      }
      entries[pkg.name] = {
        name: pkg.name,
        description: pkg.description,
        url:
          'homepage' in pkg.links
            ? pkg.links.homepage
            : 'repository' in pkg.links
            ? pkg.links.repository
            : pkg.links.npm,
        installed: false,
        enabled: false,
        status: null,
        latest_version: pkg.version,
        installed_version: '',
        blacklistEntry: isBlacklisted,
        whitelistEntry: isWhitelisted
      };
    }
    return entries;
  }

  /**
   * Translate installed extensions information from the server into entries.
   *
   * @param res Promise to the server reply data.
   */
  protected async translateInstalled(
    res: Promise<IInstalledEntry[]>
  ): Promise<{ [key: string]: IEntry }> {
    const promises = [];
    const entries: { [key: string]: IEntry } = {};
    for (const pkg of await res) {
      promises.push(
        res.then(info => {
          entries[pkg.name] = {
            name: pkg.name,
            description: pkg.description,
            url: pkg.url,
            installed: pkg.installed !== false,
            enabled: pkg.enabled,
            status: pkg.status,
            latest_version: pkg.latest_version,
            installed_version: pkg.installed_version,
            blacklistEntry: this.isListed(pkg.name, this._blacklistArray),
            whitelistEntry: this.isListed(pkg.name, this._whitelistArray)
          };
        })
      );
    }
    return Promise.all(promises).then(() => {
      return entries;
    });
  }

  private isListed(
    name: string,
    listArray: Array<IListEntry>
  ): IListEntry | undefined {
    let entry: IListEntry | undefined = undefined;
    listArray.forEach((listEntry: IListEntry) => {
      if (listEntry.regexp && listEntry.regexp?.test(name)) {
        entry = listEntry;
      }
    });
    return entry;
  }

  /**
   * Make a request to the server for info about its installed extensions.
   */
  protected fetchInstalled(
    refreshInstalled = false
  ): Promise<IInstalledEntry[]> {
    const url = new URL(
      EXTENSION_API_PATH,
      this.serverConnectionSettings.baseUrl
    );
    if (refreshInstalled) {
      url.searchParams.append('refresh', '1');
    }
    const request = ServerConnection.makeRequest(
      url.toString(),
      {},
      this.serverConnectionSettings
    ).then(response => {
      Private.handleError(response);
      return response.json() as Promise<IInstalledEntry[]>;
    });
    request.then(
      () => {
        this.serverConnectionError = null;
      },
      reason => {
        this.serverConnectionError = reason.toString();
      }
    );
    return request;
  }

  /**
   * Search with current query.
   *
   * Sets searchError and totalEntries as appropriate.
   *
   * @returns {Promise<{ [key: string]: IEntry; }>} The search result as a map of entries.
   */
  protected async performSearch(): Promise<{ [key: string]: IEntry }> {
    if (this.query === null) {
      this.query = '';
    }

    // Start the search without waiting for it:
    const search = this.searcher.searchExtensions(
      this.query,
      this.page,
      this.pagination
    );
    const searchMapPromise = this.translateSearchResult(search);

    let searchMap: { [key: string]: IEntry };
    try {
      searchMap = await searchMapPromise;
      this.searchError = null;
    } catch (reason) {
      searchMap = {};
      this.searchError = reason.toString();
    }

    return searchMap;
  }

  /**
   * Query the installed extensions.
   *
   * Sets installedError as appropriate.
   *
   * @returns {Promise<{ [key: string]: IEntry; }>} A map of installed extensions.
   */
  protected async queryInstalled(
    refreshInstalled: boolean
  ): Promise<{ [key: string]: IEntry }> {
    let installedMap;
    try {
      installedMap = await this.translateInstalled(
        this.fetchInstalled(refreshInstalled)
      );
      this.installedError = null;
    } catch (reason) {
      installedMap = {};
      this.installedError = reason.toString();
    }
    return installedMap;
  }

  /**
   * Update the current model.
   *
   * This will query the NPM repository, and the notebook server.
   *
   * Emits the `stateChanged` signal on successful completion.
   */
  protected async update(refreshInstalled = false) {
    // Start both queries before awaiting:

    const searchMapPromise = this.performSearch();
    const installedMapPromise = this.queryInstalled(refreshInstalled);

    // Await results:
    const searchMap = await searchMapPromise;
    const installedMap = await installedMapPromise;

    // Map results to attributes:
    const installed: IEntry[] = [];
    for (const key of Object.keys(installedMap)) {
      installed.push(installedMap[key]);
    }
    this._installed = installed.sort(Private.comparator);

    const searchResult: IEntry[] = [];
    for (const key of Object.keys(searchMap)) {
      // Filter out installed entries from search results:
      if (installedMap[key] === undefined) {
        searchResult.push(searchMap[key]);
      } else {
        searchResult.push(installedMap[key]);
      }
    }
    this._searchResult = searchResult.sort(Private.comparator);

    // Signal updated state
    this.stateChanged.emit(undefined);
  }

  /**
   * Send a request to the server to perform an action on an extension.
   *
   * @param action A valid action to perform.
   * @param entry The extension to perform the action on.
   */
  protected _performAction(
    action: string,
    entry: IEntry
  ): Promise<IActionReply> {
    const url = new URL(
      EXTENSION_API_PATH,
      this.serverConnectionSettings.baseUrl
    );
    const request: RequestInit = {
      method: 'POST',
      body: JSON.stringify({
        cmd: action,
        extension_name: entry.name
      })
    };
    const completed = ServerConnection.makeRequest(
      url.toString(),
      request,
      this.serverConnectionSettings
    ).then(response => {
      Private.handleError(response);
      this.triggerBuildCheck();
      return response.json() as Promise<IActionReply>;
    });
    completed.then(
      () => {
        this.serverConnectionError = null;
      },
      reason => {
        this.serverConnectionError = reason.toString();
      }
    );
    this._addPendingAction(completed);
    return completed;
  }

  /**
   * Add a pending action.
   *
   * @param pending A promise that resolves when the action is completed.
   */
  protected _addPendingAction(pending: Promise<any>): void {
    // Add to pending actions collection
    this._pendingActions.push(pending);

    // Ensure action is removed when resolved
    const remove = () => {
      const i = this._pendingActions.indexOf(pending);
      this._pendingActions.splice(i, 1);
      this.stateChanged.emit(undefined);
    };
    pending.then(remove, remove);

    // Signal changed state
    this.stateChanged.emit(undefined);
  }

  /**
   * Contains an error message if an error occurred when querying installed extensions.
   */
  installedError: string | null = null;

  /**
   * Contains an error message if an error occurred when searching for extensions.
   */
  searchError: string | null = null;

  /**
   * Contains an error message if an error occurred when searching for lists.
   */
  blacklistError: string | null = null;

  /**
   * Contains an error message if an error occurred when querying the server extension.
   */
  serverConnectionError: string | null = null;

  /**
   * Contains an error message if the server has unfulfilled requirements.
   */
  serverRequirementsError: string | null = null;

  /**
   * Whether the model has finished async initialization.
   */
  initialized: boolean = false;

  /**
   * Whether a fresh build should be considered due to actions taken.
   */
  promptBuild: boolean = false;

  /**
   * Settings for connecting to the notebook server.
   */
  protected serverConnectionSettings: ServerConnection.ISettings;

  /**
   * A helper for performing searches of jupyterlab extensions on the NPM repository.
   */
  protected searcher = new Searcher();

  protected lister = new Lister();

  /**
   * The service manager to use for building.
   */
  protected serviceManager: ServiceManager;

  private _query: string | null = null;
  private _page: number = 0;
  private _pagination: number = 250;
  private _totalEntries: number = 0;

  private _installed: IEntry[];
  private _searchResult: IEntry[];
  private _pendingActions: Promise<any>[] = [];
  private _debouncedUpdate: Debouncer<void, void>;

  private _listMode: 'black' | 'white' | 'default' | 'invalid';
  private _blacklistArray: Array<IListEntry>;
  private _whitelistArray: Array<IListEntry>;
  private _totalBlacklistedFound: number = 0;
  private _totalWhitelistedFound: number = 0;
}

let _isDisclaimed = false;

/**
 * ListModel statics.
 */
export namespace ListModel {
  /**
   * Utility function to check whether an entry can be updated.
   *
   * @param entry The entry to check.
   */
  export function entryHasUpdate(entry: IEntry): boolean {
    if (!entry.installed || !entry.latest_version) {
      return false;
    }
    return semver.lt(entry.installed_version, entry.latest_version);
  }

  export function isDisclaimed() {
    return _isDisclaimed;
  }

  export function toogleDisclaimed() {
    _isDisclaimed = !_isDisclaimed;
  }
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * A comparator function that sorts whitelisted orgs to the top.
   */
  export function comparator(a: IEntry, b: IEntry): number {
    if (a.name === b.name) {
      return 0;
    }

    const testA = isJupyterOrg(a.name);
    const testB = isJupyterOrg(b.name);

    if (testA === testB) {
      // Retain sort-order from API
      return 0;
    } else if (testA && !testB) {
      return -1;
    } else {
      return 1;
    }
  }

  /**
   * Match kernel specs against kernel spec regexps
   *
   * @param kernelInfo The info containing the regexp patterns
   * @param specs The available kernel specs.
   */
  export function matchSpecs(
    kernelInfo: IKernelInstallInfo,
    specs: KernelSpec.ISpecModels | null
  ): KernelSpec.ISpecModel[] {
    if (!specs) {
      return [];
    }
    const matches: KernelSpec.ISpecModel[] = [];
    let reLang: RegExp | null = null;
    let reName: RegExp | null = null;
    if (kernelInfo.kernel_spec.language) {
      reLang = new RegExp(kernelInfo.kernel_spec.language);
    }
    if (kernelInfo.kernel_spec.display_name) {
      reName = new RegExp(kernelInfo.kernel_spec.display_name);
    }
    for (const key of Object.keys(specs.kernelspecs)) {
      const spec = specs.kernelspecs[key]!;
      let match = false;
      if (reLang) {
        match = reLang.test(spec.language);
      }
      if (!match && reName) {
        match = reName.test(spec.display_name);
      }
      if (match) {
        matches.push(spec);
        continue;
      }
    }
    return matches;
  }

  /**
   * Convert a response to an exception on error.
   *
   * @param response The response to inspect.
   */
  export function handleError(response: Response): Response {
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`);
    }
    return response;
  }
}
