import { Token } from '@phosphor/coreutils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { IStatusBar } from '../statusBar';
import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ISignal } from '@phosphor/signaling';
import { IObservableMap, ObservableMap } from '@jupyterlab/observables';
import { IObservableSet, ObservableSet } from '../util/observableset';
import { STATUSBAR_PLUGIN_ID } from '..';
import { SetExt } from '../util/set';
import { Widget } from '@phosphor/widgets';

export interface IDefaultsManager {
    readonly enabledChanged: ISignal<
        ObservableSet<IDefaultsManager.IItem>,
        IObservableSet.IChangedArgs<IDefaultsManager.IItem>
    >;

    readonly itemAdded: ISignal<
        ObservableMap<IDefaultsManager.IItem>,
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
                settings.changed.connect(this.onSettingsUpdated);

                this.onSettingsUpdated(settings);
            })
            .catch((reason: Error) => {
                console.error(reason.message);
            });
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

    onSettingsUpdated = (settings: ISettingRegistry.ISettings) => {
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
        return this._enabledStatusItems.changed;
    }

    get itemAdded() {
        return this._allDefaultStatusItems.changed;
    }

    get allItems(): IDefaultsManager.IItem[] {
        return this._allDefaultStatusItems.values();
    }

    private _allDefaultStatusItems: ObservableMap<
        IDefaultsManager.IItem
    > = new ObservableMap();
    private _enabledStatusNames: Set<string> = new Set();
    private _enabledStatusItems: ObservableSet<
        IDefaultsManager.IItem
    > = new ObservableSet();
    private _settings: ISettingRegistry;
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
