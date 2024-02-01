/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JupyterLab } from '@jupyterlab/application';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { VDomModel } from '@jupyterlab/ui-components';
import { ISignal, Signal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { PluginInUseMessage, PluginRequiredMessage } from './dialogs';

/**
 * The server API path for querying/modifying available plugins.
 */
const PLUGIN_API_PATH = 'lab/api/plugins';

/**
 * Extension actions that the server API accepts.
 */
export type Action = 'enable' | 'disable';

/**
 * Information about a plugin.
 */
export interface IEntry extends JupyterLab.IPluginInfo {
  /**
   * Whether the plugin is locked (cannot be enabled/disabled).
   *
   * Administrators can lock plugins preventing users from introducing modifications.
   * The check is performed on the server side, this field is only to show users
   * an indicator of the lock status.
   */
  readonly locked: boolean;

  /**
   * Token name (if any) excluding the plugin prefix (unless none)
   */
  tokenLabel?: string;
}

interface IPluginManagerStatus {
  /**
   * Whether to lock (prevent enabling/disabling) all plugins.
   */
  readonly allLocked: boolean;
  /**
   * A list of plugins or extensions that cannot be toggled.
   *
   * If extension name is provided, all its plugins will be disabled.
   * The plugin names need to follow colon-separated format of `extension:plugin`.
   */
  readonly lockRules: string[];
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
 * The namespace for PluginListModel.
 */
export namespace PluginListModel {
  export interface IConfigurableState {
    /**
     * The plugin list search query.
     */
    query?: string;
    /**
     * Whether the warning is disclaimed or not.
     */
    isDisclaimed?: boolean;
  }
  /** A subset of `JupyterLab.IInfo` interface (defined to reduce API surface) */
  export interface IPluginData {
    readonly availablePlugins: JupyterLab.IPluginInfo[];
  }
  /**
   * The initialization options for a plugins list model.
   */
  export interface IOptions extends IConfigurableState {
    /**
     * Plugin data.
     */
    pluginData: IPluginData;
    /**
     * Translator.
     */
    translator?: ITranslator;
    /**
     * Server connection settings.
     */
    serverSettings?: ServerConnection.ISettings;
    /**
     * Additional plugins to lock in addition to plugins locked on the server-side.
     *
     * This is intended exclusively to protect user from shooting themselves in
     * the foot by accidentally disabling the plugin manager or other core plugins
     * (which would mean they cannot recover) and is not enforced on server side.
     */
    extraLockedPlugins?: string[];
  }
}

/**
 * The model representing plugin list.
 */
export class PluginListModel extends VDomModel {
  constructor(options: PluginListModel.IOptions) {
    super();
    this._pluginData = options.pluginData;
    this._serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    this._query = options.query || '';
    this._isDisclaimed = options.isDisclaimed ?? false;
    this._extraLockedPlugins = options.extraLockedPlugins ?? [];
    this.refresh()
      .then(() => this._ready.resolve())
      .catch(e => this._ready.reject(e));
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');
  }

  get available(): ReadonlyArray<IEntry> {
    return [...this._available.values()];
  }

  /**
   * Contains an error message if an error occurred when querying plugin status.
   */
  statusError: string | null = null;
  /**
   * Contains an error message if an error occurred when enabling/disabling plugin.
   */
  actionError: string | null = null;

  /**
   * Whether plugin data is still getting loaded.
   */
  get isLoading(): boolean {
    return this._isLoading;
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
      this._trackerDataChanged.emit(void 0);
    }
  }

  /**
   * The search query.
   *
   * Setting its value triggers a new search.
   */
  get query(): string {
    return this._query;
  }
  set query(value: string) {
    if (this._query !== value) {
      this._query = value;
      this.stateChanged.emit();
      this._trackerDataChanged.emit(void 0);
    }
  }

  /**
   * A promise that resolves when the trackable data changes
   */
  get trackerDataChanged(): ISignal<PluginListModel, void> {
    return this._trackerDataChanged;
  }

  /**
   * A promise that resolves when the plugins were fetched from the server
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Enable a plugin.
   *
   * @param entry An entry indicating which plugin to enable.
   */
  async enable(entry: IEntry): Promise<void> {
    if (!this.isDisclaimed) {
      throw new Error('User has not confirmed the disclaimer');
    }
    await this._performAction('enable', entry);
    entry.enabled = true;
  }

  /**
   * Disable a plugin.
   *
   * @param entry An entry indicating which plugin to disable.
   * @returns Whether the plugin was disabled
   */
  async disable(entry: IEntry): Promise<void> {
    if (!this.isDisclaimed) {
      throw new Error('User has not confirmed the disclaimer');
    }
    const { dependants, optionalDependants } = this.getDependants(entry);
    if (dependants.length > 0) {
      // We require user to disable plugins one-by-one as each of them may have
      // further dependencies (or optional dependencies) and we want the user to
      // take a pause to think about those.
      void showDialog({
        title: this._trans.__('This plugin is required by other plugins'),
        body: PluginRequiredMessage({
          plugin: entry,
          dependants,
          trans: this._trans
        }),
        buttons: [Dialog.okButton()]
      });
      return;
    }
    if (optionalDependants.length > 0) {
      const userConfirmation = await showDialog({
        title: this._trans.__('This plugin is used by other plugins'),
        body: PluginInUseMessage({
          plugin: entry,
          optionalDependants,
          trans: this._trans
        }),
        buttons: [
          Dialog.okButton({ label: this._trans.__('Disable anyway') }),
          Dialog.cancelButton()
        ]
      });
      if (!userConfirmation.button.accept) {
        return;
      }
    }

    await this._performAction('disable', entry);
    if (this.actionError) {
      return;
    }
    entry.enabled = false;
  }

  protected getDependants(entry: IEntry): {
    dependants: IEntry[];
    optionalDependants: IEntry[];
  } {
    const dependants = [];
    const optionalDependants = [];
    if (entry.provides) {
      const tokenName = entry.provides.name;
      for (const plugin of this._available.values()) {
        if (!plugin.enabled) {
          continue;
        }
        if (
          plugin.requires
            .filter(token => !!token)
            .some(token => token.name === tokenName)
        ) {
          dependants.push(plugin);
        }
        if (
          plugin.optional
            .filter(token => !!token)
            .some(token => token.name === tokenName)
        ) {
          optionalDependants.push(plugin);
        }
      }
    }
    return {
      dependants,
      optionalDependants
    };
  }

  /**
   * Whether there are currently any actions pending.
   */
  hasPendingActions(): boolean {
    return this._pendingActions.length > 0;
  }

  /**
   * Send a request to the server to perform an action on a plugin.
   *
   * @param action A valid action to perform.
   * @param entry The plugin to perform the action on.
   */
  private _performAction(action: string, entry: IEntry): Promise<IActionReply> {
    this.actionError = null;

    const actionRequest = this._requestAPI<IActionReply>(
      {},
      {
        method: 'POST',
        body: JSON.stringify({
          cmd: action,
          plugin_name: entry.id
        })
      }
    );

    actionRequest.catch(reason => {
      this.actionError = reason.toString();
    });

    this._addPendingAction(actionRequest);
    return actionRequest;
  }

  /**
   * Add a pending action.
   *
   * @param pending A promise that resolves when the action is completed.
   */
  private _addPendingAction(pending: Promise<any>): void {
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
   * Refresh plugin lock statuses
   */
  async refresh(): Promise<void> {
    this.statusError = null;
    this._isLoading = true;
    this.stateChanged.emit();
    try {
      // Get the lock status from backend; if backend is not available,
      // we assume that all plugins are locked.
      const fallback: IPluginManagerStatus = {
        allLocked: true,
        lockRules: []
      };
      const status =
        (await this._requestAPI<IPluginManagerStatus>()) ?? fallback;

      this._available = new Map(
        this._pluginData.availablePlugins.map(plugin => {
          let tokenLabel = plugin.provides
            ? plugin.provides.name.split(':')[1]
            : undefined;
          if (plugin.provides && !tokenLabel) {
            tokenLabel = plugin.provides.name;
          }
          return [
            plugin.id,
            {
              ...plugin,
              locked: this._isLocked(plugin.id, status),
              tokenLabel
            }
          ];
        })
      );
    } catch (reason) {
      this.statusError = reason.toString();
    } finally {
      this._isLoading = false;
      this.stateChanged.emit();
    }
  }

  private _isLocked(pluginId: string, status: IPluginManagerStatus): boolean {
    if (status.allLocked) {
      // All plugins are locked.
      return true;
    }
    if (this._extraLockedPlugins.includes(pluginId)) {
      // Plugin is locked on client side.
      return true;
    }
    const extension = pluginId.split(':')[0];
    if (status.lockRules.includes(extension)) {
      // Entire extension is locked.
      return true;
    }
    if (status.lockRules.includes(pluginId)) {
      // This plugin specifically is locked.
      return true;
    }
    return false;
  }

  /**
   * Call the plugin API
   *
   * @param endPoint API REST end point for the plugin
   * @param init Initial values for the request
   * @returns The response body interpreted as JSON
   */
  private async _requestAPI<T>(
    queryArgs: { [k: string]: any } = {},
    init: RequestInit = {}
  ): Promise<T> {
    // Make request to Jupyter API
    const settings = this._serverSettings;
    const requestUrl = URLExt.join(settings.baseUrl, PLUGIN_API_PATH);

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

  private _trackerDataChanged: Signal<PluginListModel, void> = new Signal(this);
  private _available: Map<string, IEntry>;
  private _isLoading = false;
  private _pendingActions: Promise<any>[] = [];
  private _serverSettings: ServerConnection.ISettings;
  private _ready = new PromiseDelegate<void>();
  private _query: string;
  private _pluginData: PluginListModel.IPluginData;
  private _extraLockedPlugins: string[];
  private _trans: TranslationBundle;
  private _isDisclaimed: boolean;
}
