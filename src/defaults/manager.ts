import { Token } from '@phosphor/coreutils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { Widget } from '@phosphor/widgets';
import { IStatusBar } from '../statusBar';
import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ISignal } from '@phosphor/signaling';
import { IObservableMap, ObservableMap } from '@jupyterlab/observables';
import { IObservableSet, ObservableSet } from '../util/observableset';
import { STATUSBAR_PLUGIN_ID } from '..';
import { SetExt } from '../util/set';

export interface IDefaultStatusesManager {
    readonly enabledChanged: ISignal<
        ObservableSet<IDefaultStatusesManager.IItem>,
        IObservableSet.IChangedArgs<IDefaultStatusesManager.IItem>
    >;

    readonly itemAdded: ISignal<
        ObservableMap<IDefaultStatusesManager.IItem>,
        IObservableMap.IChangedArgs<IDefaultStatusesManager.IItem>
    >;

    readonly allItems: IDefaultStatusesManager.IItem[];

    addDefaultStatus(
        id: string,
        widget: Widget,
        opts: IStatusBar.IItemOptions
    ): void;
}

export namespace IDefaultStatusesManager {
    export interface IItem {
        id: string;
        item: Widget;
        opts: IStatusBar.IItemOptions;
    }
}

// tslint:disable-next-line:variable-name
export const IDefaultStatusesManager = new Token<IDefaultStatusesManager>(
    'jupyterlab-statusbar/IDefaultStatusesManager'
);

export class DefaultStatusesManager implements IDefaultStatusesManager {
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

    get allItems(): IDefaultStatusesManager.IItem[] {
        return this._allDefaultStatusItems.values();
    }

    private _allDefaultStatusItems: ObservableMap<
        IDefaultStatusesManager.IItem
    > = new ObservableMap();
    private _enabledStatusNames: Set<string> = new Set();
    private _enabledStatusItems: ObservableSet<
        IDefaultStatusesManager.IItem
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
export const defaultsManager: JupyterLabPlugin<IDefaultStatusesManager> = {
    id: 'jupyterlab-statusbar/defaults-manager',
    provides: IDefaultStatusesManager,
    autoStart: true,
    requires: [ISettingRegistry],
    activate: (_app: JupyterLab, settings: ISettingRegistry) => {
        return new DefaultStatusesManager({ settings });
    }
};

export namespace Private {
    export function notEmpty<TValue>(
        value: TValue | null | undefined
    ): value is TValue {
        return value !== null && value !== undefined;
    }
}
