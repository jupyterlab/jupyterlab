import { Token } from '@phosphor/coreutils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IStatusBar } from '../statusBar';
import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { STATUSBAR_PLUGIN_ID } from '..';
import { SetExt } from '../util/set';
import { Widget } from '@phosphor/widgets';
import { Signal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { SignalExt } from '../util/signal';
import { SettingsConnector } from '../util/settings';

export interface IDefaultsManager {
  addDefaultStatus(
    id: string,
    widget: Widget,
    opts: IStatusBar.IItemOptions
  ): void;
}

export namespace IDefaultsManager {
  export interface IItem {
    id: string;
    item: Widget;
    opts: IStatusBar.IItemOptions;
  }
}

// tslint:disable-next-line:variable-name
export const IDefaultsManager = new Token<IDefaultsManager>(
  '@jupyterlab/statusbar:IDefaultStatusesManager'
);

class DefaultsManager implements IDefaultsManager, IDisposable {
  constructor(opts: DefaultsManager.IOptions) {
    this._statusBar = opts.statusBar;
    this._settingsConnector = new SettingsConnector({
      pluginId: STATUSBAR_PLUGIN_ID,
      registry: opts.settings,
      settingKey: 'enabledDefaultItems'
    });

    this._settingsConnector.changed.connect(this._onSettingsUpdated);
  }

  addDefaultStatus(
    id: string,
    item: Widget,
    opts: IStatusBar.IItemOptions
  ): void {
    // Combine settings and provided isActive function
    if (opts.isActive === undefined) {
      opts.isActive = () => {
        return this._enabledStatusIds.has(id);
      };
    } else {
      const prevIsActive = opts.isActive;
      opts.isActive = () => {
        return prevIsActive() && this._enabledStatusIds.has(id);
      };
    }

    // Combine stateChanged of settings with provided stateChanged
    const stateChanged: SignalExt.CombinedSignal<
      this,
      void
    > = new SignalExt.CombinedSignal(this);
    if (opts.stateChanged === undefined) {
      opts.stateChanged = stateChanged;
    } else {
      opts.stateChanged = new SignalExt.CombinedSignal(
        this,
        opts.stateChanged,
        stateChanged
      );
    }

    const defaultItem = {
      id,
      item,
      opts,
      stateChanged
    };

    this._statusBar.registerStatusItem(id, item, opts);
    this._allDefaultStatusItems.set(id, defaultItem);
  }

  get isDisposed() {
    return this._isDisposed;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }

    Signal.clearData(this);
    this._settingsConnector.dispose();
    this._allDefaultStatusItems.forEach(item => {
      item.stateChanged.dispose();
    });
    this._isDisposed = true;
  }

  private _onSettingsUpdated = (
    connector: SettingsConnector<string[]>,
    change: SettingsConnector.IChangedArgs<string[]>
  ) => {
    let rawEnabledItems = change.newValue !== null ? change.newValue : [];

    let newEnabledItems = new Set(rawEnabledItems);

    let idsToRemove = SetExt.difference(
      this._enabledStatusIds,
      newEnabledItems
    );

    let idsToAdd = SetExt.difference(newEnabledItems, this._enabledStatusIds);

    SetExt.deleteAll(this._enabledStatusIds, [...idsToRemove]);
    SetExt.addAll(this._enabledStatusIds, [...idsToAdd]);

    [...idsToAdd, ...idsToRemove].forEach(val => {
      const statusItem = this._allDefaultStatusItems.get(val);
      if (statusItem !== undefined) {
        statusItem.stateChanged.emit(void 0);
      }
    });
  };

  private _allDefaultStatusItems: Map<
    string,
    DefaultsManager.IItem
  > = new Map();
  private _enabledStatusIds: Set<string> = new Set();
  private _isDisposed: boolean = false;
  private _settingsConnector: SettingsConnector<string[]>;
  private _statusBar: IStatusBar;
}

namespace DefaultsManager {
  export interface IOptions {
    settings: ISettingRegistry;
    statusBar: IStatusBar;
  }

  export interface IItem extends IDefaultsManager.IItem {
    stateChanged: SignalExt.CombinedSignal<any, void>;
  }
}

/**
 * Initialization data for the statusbar extension.
 */
export const defaultsManager: JupyterLabPlugin<IDefaultsManager> = {
  id: '@jupyterlab/statusbar:defaults-manager',
  provides: IDefaultsManager,
  autoStart: true,
  requires: [ISettingRegistry, IStatusBar],
  activate: (
    _app: JupyterLab,
    settings: ISettingRegistry,
    statusBar: IStatusBar
  ) => {
    return new DefaultsManager({ settings, statusBar });
  }
};
