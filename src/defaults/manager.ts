import { Token } from '@phosphor/coreutils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IStatusBar } from '../statusBar';
import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ISignal, Signal } from '@phosphor/signaling';
import { IObservableMap, ObservableMap } from '@jupyterlab/observables';
import { IObservableSet, ObservableSet } from '../util/observableset';
import { STATUSBAR_PLUGIN_ID } from '..';
import { SetExt } from '../util/set';
import { Widget } from '@phosphor/widgets';
import { IDisposable } from '@phosphor/disposable';

export interface IDefaultsManager extends IDisposable {
    readonly enabledChanged: ISignal<
        this,
        IObservableSet.IChangedArgs<IDefaultsManager.IItem>
    >;

    readonly itemAdded: ISignal<
        this,
        IObservableMap.IChangedArgs<IDefaultsManager.IItem>
    >;

    readonly allItems: IDefaultsManager.IItem[];

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
    'jupyterlab-statusbar/IDefaultStatusesManager'
);

export class DefaultsManager implements IDefaultsManager {
    constructor(opts: DefaultStatusesManager.IOptions) {
        this._settings = opts.settings;

        this._settings
            .load(STATUSBAR_PLUGIN_ID)
            .then(settings => {
                settings.changed.connect(this._onSettingsUpdated);

                this._onSettingsUpdated(settings);
            })
            .catch((reason: Error) => {
                console.error(reason.message);
            });

        this._allDefaultStatusItems.changed.connect(this._onItemAdd);
        this._enabledStatusItems.changed.connect(this._onItemStatusChange);
    }

    addDefaultStatus(
        id: string,
        widget: Widget,
        opts: IStatusBar.IItemOptions
    ): void {
        let defaultItem = {
            id,
            item: widget,
            opts
        };

        this._allDefaultStatusItems.set(id, defaultItem);

        // If the current list of default names contains the new name,
        // then add the new item to the enabled list
        if (this._enabledStatusNames.has(id)) {
            this._enabledStatusItems.add(defaultItem);
        }
    }

    private _onItemAdd = (
        allItems: ObservableMap<IDefaultsManager.IItem>,
        change: IObservableMap.IChangedArgs<IDefaultsManager.IItem>
    ) => {
        this._itemAdded.emit(change);
    };

    private _onItemStatusChange = (
        enabledItems: ObservableSet<IDefaultsManager.IItem>,
        change: IObservableSet.IChangedArgs<IDefaultsManager.IItem>
    ) => {
        this._enabledChanged.emit(change);
    };

    private _onSettingsUpdated = (settings: ISettingRegistry.ISettings) => {
        let rawEnabledItems = settings.get('enabledDefaultItems').composite as
            | string[]
            | null;

        if (rawEnabledItems === null) {
            rawEnabledItems = settings.default(
                'enabledDefaultItems'
            ) as string[];
        }

        let newEnabledItems = new Set(rawEnabledItems);

        let idsToRemove = SetExt.difference(
            this._enabledStatusNames,
            newEnabledItems
        );

        let idsToAdd = SetExt.difference(
            newEnabledItems,
            this._enabledStatusNames
        );

        let itemsToRemove = [...idsToRemove]
            .map(element => this._allDefaultStatusItems.get(element))
            .filter(Private.notEmpty);

        let itemsToAdd = [...idsToAdd]
            .map(element => this._allDefaultStatusItems.get(element))
            .filter(Private.notEmpty);

        this._enabledStatusItems.deleteAll(itemsToRemove);
        this._enabledStatusItems.addAll(itemsToAdd);

        this._enabledStatusNames = newEnabledItems;
    };

    get enabledChanged() {
        return this._enabledChanged;
    }

    get itemAdded() {
        return this._itemAdded;
    }

    get allItems(): IDefaultsManager.IItem[] {
        return this._allDefaultStatusItems.values();
    }

    get isDisposed() {
        return this._isDisposed;
    }

    dispose() {
        if (this._isDisposed) {
            return;
        }

        Signal.clearData(this);
        this._isDisposed = true;
    }

    private _allDefaultStatusItems: ObservableMap<
        IDefaultsManager.IItem
    > = new ObservableMap();
    private _enabledStatusNames: Set<string> = new Set();
    private _enabledStatusItems: ObservableSet<
        IDefaultsManager.IItem
    > = new ObservableSet();
    private _settings: ISettingRegistry;

    private _isDisposed: boolean = false;
    private _enabledChanged: Signal<
        this,
        IObservableSet.IChangedArgs<IDefaultsManager.IItem>
    > = new Signal(this);
    private _itemAdded: Signal<
        this,
        IObservableMap.IChangedArgs<IDefaultsManager.IItem>
    > = new Signal(this);
}

export namespace DefaultStatusesManager {
    export interface IOptions {
        settings: ISettingRegistry;
    }
}

/**
 * Initialization data for the statusbar extension.
 */
export const defaultsManager: JupyterLabPlugin<IDefaultsManager> = {
    id: 'jupyterlab-statusbar/defaults-manager',
    provides: IDefaultsManager,
    autoStart: true,
    requires: [ISettingRegistry],
    activate: (_app: JupyterLab, settings: ISettingRegistry) => {
        return new DefaultsManager({ settings });
    }
};

export namespace Private {
    export function notEmpty<TValue>(
        value: TValue | null | undefined
    ): value is TValue {
        return value !== null && value !== undefined;
    }
}
