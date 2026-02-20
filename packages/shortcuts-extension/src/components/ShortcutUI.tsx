/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { ReadonlyJSONObject } from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import * as React from 'react';
import { NewShortcutItem } from './NewShortcutItem';
import { ShortcutItem } from './ShortcutItem';
import { ShortcutList } from './ShortcutList';
import { TopNav } from './TopNav';
import { ShortcutRegistry } from '../registry';
import type {
  ICustomOptions,
  IKeybinding,
  ISearchResult,
  IShortcutRegistry,
  IShortcutsSettingsLayout,
  IShortcutTarget,
  IShortcutUI
} from '../types';

/** Props for ShortcutUI component */
export interface IShortcutUIProps {
  external: IShortcutUI.IExternalBundle;
  height: number;
  width: number;
}

/** State for ShortcutUI component */
export interface IShortcutUIState {
  shortcutRegistry: IShortcutRegistry | null;
  filteredShortcutList: IShortcutTarget[];
  shortcutsFetched: boolean;
  searchQuery: string;
  showSelectors: boolean;
  currentSort: IShortcutUI.ColumnId;
  showAddCommand: boolean;
  newShortcut: IShortcutTarget;
}

/** Top level React component for widget */
export class ShortcutUI
  extends React.Component<IShortcutUIProps, IShortcutUIState>
  implements IShortcutUI
{
  constructor(props: IShortcutUIProps) {
    super(props);
    this._newShortcutItem = new NewShortcutItem({
      showSelectors: false,
      findConflictsFor: (keys: string[], selector: string) => {
        if (this.state.shortcutRegistry) {
          return this.state.shortcutRegistry.findConflictsFor(keys, selector);
        } else {
          console.error(
            'Cannot search for keybinding conflicts at this time: registry is not ready'
          );
          return [];
        }
      },
      external: this.props.external
    });

    this.state = {
      shortcutRegistry: null,
      filteredShortcutList: new Array<IShortcutTarget>(),
      shortcutsFetched: false,
      searchQuery: '',
      showSelectors: false,
      currentSort: 'category',
      showAddCommand: false,
      newShortcut: this._newShortcutItem.shortcut
    };

    this._newShortcutItem.changed.connect((_: any, newShortcutItem) => {
      this.setState({ newShortcut: { ...this._newShortcutItem.shortcut } });
    });
  }

  /** Fetch shortcut list on mount */
  componentDidMount(): void {
    this.props.external.actionRequested.connect(this._onActionRequested, this);
    void this._refreshShortcutList();
  }

  componentWillUnmount(): void {
    this.props.external.actionRequested.disconnect(
      this._onActionRequested,
      this
    );
  }

  private async _onActionRequested(
    _: unknown,
    action: IShortcutUI.ActionRequest
  ): Promise<void> {
    if (action.request === 'toggle-selectors') {
      return this.toggleSelectors();
    }
    if (action.request === 'reset-all') {
      await this.resetShortcuts();
    }
  }

  /** Fetch shortcut list from SettingRegistry  */
  private async _refreshShortcutList(): Promise<void> {
    const settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout> =
      await this.props.external.getSettings();
    const shortcutRegistry = new ShortcutRegistry({
      commandRegistry: this.props.external.commandRegistry,
      settings
    });
    this.setState(
      {
        shortcutRegistry: shortcutRegistry,
        filteredShortcutList: this._searchFilterShortcuts(shortcutRegistry),
        shortcutsFetched: true
      },
      () => {
        this.sortShortcuts();
      }
    );
  }

  /** Set the current search query */
  updateSearchQuery = (query: string): void => {
    this.setState(
      {
        searchQuery: query
      },
      () => {
        const registry = this.state.shortcutRegistry;
        this.setState(
          {
            filteredShortcutList: this._searchFilterShortcuts(registry)
          },
          () => {
            this.sortShortcuts();
          }
        );
      }
    );
  };

  /** Filter shortcut list using current search query */
  private _searchFilterShortcuts(
    registry: IShortcutRegistry | null
  ): IShortcutTarget[] {
    if (!registry) {
      return [];
    }
    const filteredShortcuts = ShortcutRegistry.matchItems(
      registry,
      this.state.searchQuery
    ).map((item: ISearchResult) => {
      return item.item;
    });
    return filteredShortcuts;
  }

  /**
   * Reset all keybindings to their defaults
   */
  resetShortcuts = async (): Promise<void> => {
    const settings = await this.props.external.getSettings();
    await settings.set('shortcuts', []);
    await this._refreshShortcutList();
  };

  /**
   * Reset keybindings for given target to defaults.
   */
  resetKeybindings = async (target: IShortcutTarget): Promise<void> => {
    await this._setKeybinding(target, []);
  };

  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   */
  replaceKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding,
    keys: string[]
  ): Promise<void> => {
    return this._setKeybinding(target, keys, keybinding);
  };

  /**
   * Delete a single keybinding for given shortcut target.
   */
  deleteKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding
  ): Promise<void> => {
    await this._setKeybinding(target, [], keybinding);
  };

  /**
   * Add a new keybinding.
   */
  addKeybinding = async (
    target: IShortcutTarget,
    keys: string[]
  ): Promise<void> => {
    await this._setKeybinding(target, keys);
  };

  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   *
   * If keybinding is not given a new keybinding will be created.
   * If keys are empty (or include a single empty string) the keybinding will be deleted.
   * If keybinding is a default keybinding and the provided keys differ from default, it will be disabled.
   */
  private async _setKeybinding(
    target: IShortcutTarget,
    keys: string[],
    keybinding?: IKeybinding
  ): Promise<void> {
    if (keys.length === 1 && keys[0] == '') {
      keys = [];
    }
    const settings = await this.props.external.getSettings();
    const userShortcuts = settings.user.shortcuts ?? [];
    const newUserShortcuts = [];
    let found = false;
    // Copy over existing user keybindings
    for (let shortcut of userShortcuts) {
      // If this is the query keybinding, update it with new `keys`
      if (
        shortcut.command === target.command &&
        shortcut.selector === target.selector &&
        JSONExt.deepEqual(shortcut.args ?? {}, target.args ?? {}) &&
        keybinding &&
        JSONExt.deepEqual(keybinding.keys, shortcut.keys)
      ) {
        const matchesDefault =
          keybinding.isDefault && JSONExt.deepEqual(keybinding.keys, keys);

        // If the new `keys` are empty, do not copy this one over.
        // Also, if the keybinding is a default keybinding and the desired
        // new `keys` are the same as default, it does not need to be added.
        if (keys.length !== 0 && !matchesDefault) {
          newUserShortcuts.push({
            command: shortcut.command,
            selector: shortcut.selector,
            keys: keys
          });
        }
        found = true;
      } else if (
        shortcut.command === target.command &&
        shortcut.selector === target.selector &&
        JSONExt.deepEqual(shortcut.args ?? {}, target.args ?? {}) &&
        !keybinding &&
        keys.length === 0
      ) {
        continue;
      } else {
        newUserShortcuts.push(shortcut);
      }
    }
    if (!found) {
      const requiresChange =
        !keybinding || !JSONExt.deepEqual(keybinding.keys, keys);
      const shouldDisableDefault =
        keybinding && keybinding.isDefault && requiresChange;
      if (shouldDisableDefault) {
        // If the replaced keybinding is the default, disable it.
        newUserShortcuts.push({
          command: target.command,
          selector: target.selector,
          disabled: true,
          keys: keybinding.keys
        });
      }
      if (keys.length !== 0) {
        newUserShortcuts.push({
          command: target.command,
          selector: target.selector,
          keys: keys
        });
      }
    }
    await settings.set('shortcuts', newUserShortcuts as any);
    await this._refreshShortcutList();
  }

  /**
   * Update the selector and args for a user defined shortcut.
   */
  setCustomOptions = async (
    target: IShortcutTarget,
    options: ICustomOptions
  ): Promise<boolean> => {
    const settings = await this.props.external.getSettings();
    const userShortcuts = settings.user.shortcuts ?? [];
    const shortcuts = userShortcuts.filter(
      shortcut =>
        shortcut.command === target.command &&
        shortcut.selector === target.selector &&
        JSONExt.deepEqual(shortcut.args ?? {}, target.args ?? {})
    );
    if (!shortcuts.length) {
      console.error('Error writing the custom options: target not found');
      return false;
    }
    shortcuts.forEach(shortcut => {
      shortcut.selector = options.selector;
      shortcut.args = options.args;
    });

    await settings.set('shortcuts', userShortcuts as any);
    await this._refreshShortcutList();
    return true;
  };

  /** Toggles showing command selectors */
  toggleSelectors = (): void => {
    this.setState({ showSelectors: !this.state.showSelectors });
  };

  /**
   * Toggle showing add command row.
   */
  toggleAddCommandRow = async (): Promise<void> => {
    this.setState({ showAddCommand: !this.state.showAddCommand });
  };

  /**
   * Set the sort order for the shortcuts listing.
   */
  updateSort = (value: IShortcutUI.ColumnId): void => {
    if (value !== this.state.currentSort) {
      this.setState({ currentSort: value }, this.sortShortcuts);
    }
  };

  /**
   * Sort shortcut list using current sort property.
   */
  sortShortcuts(): void {
    const shortcuts: IShortcutTarget[] = this.state.filteredShortcutList;
    let sortCriteria = this.state.currentSort;
    if (sortCriteria === 'command') {
      sortCriteria = 'label';
    }
    const getValue = (target: IShortcutTarget): string => {
      if (sortCriteria === 'source') {
        return target.keybindings.every(k => k.isDefault) ? 'default' : 'other';
      }
      return target[sortCriteria] ?? '';
    };
    shortcuts.sort((a: IShortcutTarget, b: IShortcutTarget) => {
      const compareA: string = getValue(a);
      const compareB: string = getValue(b);
      const compareResult = compareA.localeCompare(compareB);
      if (compareResult) {
        return compareResult;
      } else {
        const aLabel = a['label'] ?? '';
        const bLabel = b['label'] ?? '';
        return aLabel.localeCompare(bLabel);
      }
    });
    this.setState({ filteredShortcutList: shortcuts });
  }

  /**
   * Save a new shortcut:
   * - creates keybindings for the command
   * - adds the args to the shortcut commands
   */
  saveNewShortcut = async (): Promise<void> => {
    const shortcut = { ...this.state.newShortcut, args: undefined };
    for (let keybinding of shortcut.keybindings) {
      await this.addKeybinding(shortcut, keybinding.keys);
    }

    const created = await this.setCustomOptions(shortcut, {
      selector: shortcut.selector,
      args: this.state.newShortcut.args as ReadonlyJSONObject
    });

    if (created) {
      this._newShortcutItem.reset();
      void this.toggleAddCommandRow();
    }
  };

  render(): JSX.Element | null {
    if (!this.state.shortcutsFetched) {
      return null;
    }
    return (
      <div className="jp-Shortcuts-ShortcutUI" id="jp-shortcutui">
        <TopNav
          updateSearchQuery={this.updateSearchQuery}
          resetShortcuts={this.resetShortcuts}
          toggleSelectors={this.toggleSelectors}
          showSelectors={this.state.showSelectors}
          updateSort={this.updateSort}
          currentSort={this.state.currentSort}
          toggleAddCommandRow={this.toggleAddCommandRow}
          showAddCommandRow={this.state.showAddCommand}
          width={this.props.width}
          translator={this.props.external.translator}
        />
        {this.state.showAddCommand && (
          <ShortcutItem
            {...this._newShortcutItem}
            shortcut={this.state.newShortcut}
            newShortcutUtils={{
              searchQuery: this.state.searchQuery,
              updateCommand: this._newShortcutItem.updateCommand,
              saveShortcut: this.saveNewShortcut,
              hideAddCommandRow: this.toggleAddCommandRow
            }}
          />
        )}
        <ShortcutList
          shortcuts={this.state.filteredShortcutList}
          resetKeybindings={this.resetKeybindings}
          addKeybinding={this.addKeybinding}
          replaceKeybinding={this.replaceKeybinding}
          deleteKeybinding={this.deleteKeybinding}
          setCustomOptions={this.setCustomOptions}
          showSelectors={this.state.showSelectors}
          findConflictsFor={(keys: string[], selector: string) => {
            if (this.state.shortcutRegistry) {
              return this.state.shortcutRegistry.findConflictsFor(
                keys,
                selector
              );
            } else {
              console.error(
                'Cannot search for keybinding conflicts at this time: registry is not ready'
              );
              return [];
            }
          }}
          height={this.props.height}
          external={this.props.external}
        />
      </div>
    );
  }

  private _newShortcutItem: NewShortcutItem;
}
