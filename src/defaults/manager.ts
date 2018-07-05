import { Token } from '@phosphor/coreutils';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { Widget } from '@phosphor/widgets';
import { IStatusBar } from '../statusBar';
import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ISignal } from '@phosphor/signaling';
import { IObservableSet, ObservableSet } from '../util/observableset';
import { STATUSBAR_PLUGIN_ID } from '..';

export interface IDefaultStatusesManager {
    readonly itemsChanged: ISignal<
        ObservableSet<IDefaultStatusesManager.IItem>,
        IObservableSet.IChangedArgs<IDefaultStatusesManager.IItem>
    >;

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

        let idsToRemove = Private.difference(
            this._enabledStatusNames,
            newEnabledItems
        );

        let idsToAdd = Private.difference(
            newEnabledItems,
            this._enabledStatusNames
        );

        let itemsToRemove = [...idsToRemove]
            .map(element => this._allDefaultStatusItems.get(element))
            .filter(elem => elem !== undefined);

        let itemsToAdd = [...idsToAdd]
            .map(element => this._allDefaultStatusItems.get(element))
            .filter(elem => elem !== undefined);

        this._enabledStatusItems.deleteAll(itemsToRemove);
        this._enabledStatusItems.addAll(itemsToAdd);

        this._enabledStatusNames = newEnabledItems;
    };

    get itemsChanged() {
        return this._enabledStatusItems.changed;
    }

    private _allDefaultStatusItems: Map<
        string,
        IDefaultStatusesManager.IItem
    > = new Map();
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

namespace Private {
    export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a].filter(x => !b.has(x)));
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
        let manager = new DefaultStatusesManager({ settings });

        manager.itemsChanged.connect((_allItems, itemChange) => {
            console.log(`Items changed`);
            console.log(itemChange);
        });

        return manager;
    }
};
