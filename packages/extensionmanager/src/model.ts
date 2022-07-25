// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/* global RequestInit */

import { URLExt } from '@jupyterlab/coreutils';
import {
  KernelSpec,
  ServerConnection,
  ServiceManager
} from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { VDomModel } from '@jupyterlab/ui-components';
import { Debouncer } from '@lumino/polling';
import * as semver from 'semver';
import {
  IKernelInstallInfo
  // KernelCompanion,
  // presentCompanions
} from './companions';
import { reportInstallError } from './dialog';

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
  installed?: boolean | null;

  /**
   * Whether the extension is allowed or not.
   */
  is_allowed: boolean;

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

  /**
   * The package type (prebuilt or source).
   */
  pkg_type: 'prebuilt' | 'source';

  /**
   * The information about extension installation.
   */
  install?: IInstall | null;
}

/**
 * Information about extension installation.
 */
export interface IInstall {
  /**
   * The used package manager (e.g. pip, conda...)
   */
  packageManager: string | undefined;

  /**
   * The package name as known by the package manager.
   */
  packageName: string | undefined;

  /**
   * The uninstallation instructions as a comprehensive
   * text for the end user.
   */
  uninstallInstructions: string | undefined;
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
    serviceManager: ServiceManager.IManager,
    translator?: ITranslator
  ) {
    super();
    this.translator = translator || nullTranslator;
    this._installed = [];
    this._searchResult = [];
    this.serviceManager = serviceManager;
    this._debouncedUpdate = new Debouncer(this.update.bind(this), 1000);
  }

  /**
   * A readonly array of the installed extensions.
   */
  get installed(): ReadonlyArray<IEntry> {
    return this._installed;
  }

  /**
   * Whether the warning is disclaimed or not.
   */
  get isDisclaimed(): boolean {
    return this._isDisclaimed;
  }
  set isDisclaimed(v: boolean) {
    if (v !== this._isDisclaimed) {
      this._isDisclaimed = v;
      this.stateChanged.emit();
      void this._debouncedUpdate.invoke();
    }
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
    if (this._query !== value) {
      this._query = value;
    }
  }

  /**
   * The current search page.
   *
   * Setting its value triggers a new search.
   */
  get page(): number {
    return this._page;
  }
  set page(value: number) {
    if (this._page !== value) {
      this._page = value;
      void this._debouncedUpdate.invoke();
    }
  }

  /**
   * The search pagination.
   *
   * Setting its value triggers a new search.
   */
  get pagination(): number {
    return this._pagination;
  }
  set pagination(value: number) {
    if (this._pagination !== value) {
      this._pagination = value;
      void this._debouncedUpdate.invoke();
    }
  }

  /**
   * The total number of results in the current search.
   */
  get totalEntries(): number {
    return this._totalEntries;
  }

  /**
   * Dispose the extensions list model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._debouncedUpdate.dispose();
    super.dispose();
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
          reportInstallError(entry.name, data.message, this.translator);
        }
        return this.update();
      });
    }
    await this.checkCompanionPackages(entry).then(shouldInstall => {
      if (shouldInstall) {
        return this._performAction('install', entry).then(data => {
          if (data.status !== 'ok') {
            reportInstallError(entry.name, data.message, this.translator);
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
    // TODO
    return Promise.resolve(false);
    // return this.searcher
    //   .fetchPackageData(entry.name, entry.latest_version)
    //   .then(data => {
    //     if (!data || !data.jupyterlab || !data.jupyterlab.discovery) {
    //       return true;
    //     }
    //     const discovery = data.jupyterlab.discovery;
    //     const kernelCompanions: KernelCompanion[] = [];
    //     if (discovery.kernel) {
    //       // match specs
    //       for (const kernelInfo of discovery.kernel) {
    //         const matches = Private.matchSpecs(
    //           kernelInfo,
    //           this.serviceManager.kernelspecs.specs
    //         );
    //         kernelCompanions.push({ kernelInfo, kernels: matches });
    //       }
    //     }
    //     if (kernelCompanions.length < 1 && !discovery.server) {
    //       return true;
    //     }
    //     return presentCompanions(
    //       kernelCompanions,
    //       discovery.server,
    //       this.translator
    //     );
    //   });
  }

  /**
   * Refresh installed packages
   */
  refreshInstalled(): void {
    const refresh = this.update(true);
    this._addPendingAction(refresh);
  }

  /**
   * Search with current query.
   *
   * Sets searchError and totalEntries as appropriate.
   *
   * @returns {Promise<{ [key: string]: IEntry; }>} The search result as a map of entries.
   */
  protected async performSearch(): Promise<{ [key: string]: IEntry }> {
    let searchMap: { [key: string]: IEntry } = {};
    this.searchError = null;
    try {
      const extensions = await Private.requestAPI<IEntry[]>({
        query: this.query ?? '',
        page: this.page,
        per_page: this.pagination
      });
      searchMap = extensions.reduce<{ [k: string]: IEntry }>((agg, ext) => {
        agg[ext.name] = ext;
        return agg;
      }, {});
      this._totalEntries = extensions.length;
    } catch (reason) {
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
    let installedMap = {};
    this.installedError = null;
    try {
      const extensions = await Private.requestAPI<IEntry[]>({
        refresh: refreshInstalled ? 1 : 0
      });
      installedMap = extensions.reduce<{ [key: string]: IEntry }>(
        (agg, ext) => {
          agg[ext.name] = ext;
          return agg;
        },
        {}
      );
    } catch (reason) {
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
  protected async update(refreshInstalled = false): Promise<void> {
    if (this.isDisclaimed) {
      const [searchMap, installedMap] = await Promise.all([
        this.performSearch(),
        // Promise.resolve<{ [k: string]: IEntry }>({}),
        this.queryInstalled(refreshInstalled)
      ]);

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
    }

    // Signal updated state
    this.stateChanged.emit();
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
    const actionRequest = Private.requestAPI<IActionReply>(undefined, {
      method: 'POST',
      body: JSON.stringify({
        cmd: action,
        extension_name: entry.name
      })
    });

    actionRequest.then(
      () => {
        this.serverConnectionError = null;
      },
      reason => {
        this.serverConnectionError = reason.toString();
      }
    );
    this._addPendingAction(actionRequest);
    return actionRequest;
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
   * Contains an error message if an error occurred when querying the server extension.
   */
  serverConnectionError: string | null = null;

  /**
   * Contains an error message if the server has unfulfilled requirements.
   */
  serverRequirementsError: string | null = null;

  /**
   * Whether a reload should be considered due to actions taken.
   */
  promptReload: boolean = false;

  isUpdating = false;

  /**
   * The service manager to use for building.
   */
  protected serviceManager: ServiceManager.IManager;

  protected translator: ITranslator;

  private _isDisclaimed = false;
  private _query: string | null = ''; // TODO: we may not need the null case?
  private _page: number = 0;
  private _pagination: number = 250;
  private _totalEntries: number = 0;

  private _installed: IEntry[];
  private _searchResult: IEntry[];
  private _pendingActions: Promise<any>[] = [];
  private _debouncedUpdate: Debouncer<void, void>;
}

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
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * A comparator function that sorts allowedExtensions orgs to the top.
   */
  export function comparator(a: IEntry, b: IEntry): number {
    if (a.name === b.name) {
      return 0;
    } else {
      return a.name > b.name ? 1 : -1;
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
   * Call the API extension
   *
   * @param endPoint API REST end point for the extension
   * @param init Initial values for the request
   * @returns The response body interpreted as JSON
   */
  export async function requestAPI<T>(
    queryArgs: { [k: string]: any } = {},
    init: RequestInit = {}
  ): Promise<T> {
    // Make request to Jupyter API
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(
      settings.baseUrl,
      EXTENSION_API_PATH // API Namespace
    );

    let response: Response;
    try {
      response = await ServerConnection.makeRequest(
        requestUrl + URLExt.objectToQueryString(queryArgs),
        init,
        settings
      );
    } catch (error) {
      throw new ServerConnection.NetworkError(error);
    }

    let data: any = await response.text();

    if (data.length > 0) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.log('Not a JSON response body.', response);
      }
    }

    if (!response.ok) {
      throw new ServerConnection.ResponseError(response, data.message || data);
    }

    return data;
  }
}
