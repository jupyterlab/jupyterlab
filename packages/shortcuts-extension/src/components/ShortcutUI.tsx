/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import type { ReadonlyJSONObject } from '@lumino/coreutils';
import { JSONExt } from '@lumino/coreutils';
import { Platform } from '@lumino/domutils';
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

type ShortcutOverride = CommandRegistry.IKeyBindingOptions & {
  disabled?: boolean;
};

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

    this._newShortcutItem.changed.connect(() => {
      this.setState({ newShortcut: { ...this._newShortcutItem.shortcut } });
    });
  }

  /** Fetch shortcut list on mount */
  componentDidMount(): void {
    this._isMounted = false;
    this.props.external.actionRequested.connect(this._onActionRequested, this);
    void this._loadShortcutList();
  }

  componentWillUnmount(): void {
    this._isMounted = true;
    this.props.external.actionRequested.disconnect(
      this._onActionRequested,
      this
    );
    this._disconnectSettings();
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

  /** Load shortcut settings from SettingRegistry. */
  private async _loadShortcutList(): Promise<void> {
    const settings = await this.props.external.getSettings();
    if (this._isMounted) {
      return;
    }

    this._disconnectSettings();
    this._settings = settings;
    this._settings.changed.connect(this._refreshShortcutList, this);
    this._refreshShortcutList(settings);
  }

  /** Refresh shortcut list from loaded settings. */
  private _refreshShortcutList(
    settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout> | null = this
      ._settings
  ): void {
    if (!settings || this._isMounted) {
      return;
    }
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

  private _disconnectSettings(): void {
    if (this._settings) {
      this._settings.changed.disconnect(this._refreshShortcutList, this);
      this._settings = null;
    }
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
    // `keybinding.keys` as exposed by the registry are platform-resolved and
    // normalized, while `keys` come from user input which may use e.g. `Accel`
    // where the registry surfaces `Cmd` or `Ctrl`; normalize before comparing.
    // The replacement/new binding still persists the raw `keys` so that
    // platform-agnostic modifiers like `Accel` are preserved in the user
    // settings; entries derived from existing keybindings (such as the
    // `disabled` override of a default) persist the resolved `keybinding.keys`.
    const normalizedKeys = keys.map(CommandRegistry.normalizeKeystroke);
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
        // `keybinding.keys` are the resolved (normalized) platform keys exposed
        // by the registry, so compare against the resolved keys of the raw user
        // shortcut rather than its (possibly platform-specific) `keys` fallback.
        JSONExt.deepEqual(
          keybinding.keys,
          CommandRegistry.normalizeKeys(shortcut)
        )
      ) {
        const matchesDefault =
          keybinding.isDefault &&
          JSONExt.deepEqual(keybinding.keys, normalizedKeys);

        // If the new `keys` are empty, do not copy this one over.
        // Also, if the keybinding is a default keybinding and the desired
        // new `keys` are the same as default, it does not need to be added.
        if (keys.length !== 0 && !matchesDefault) {
          newUserShortcuts.push(this._setShortcutKeys(shortcut, keys));
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
        !keybinding || !JSONExt.deepEqual(keybinding.keys, normalizedKeys);
      if (!requiresChange) {
        return;
      }
      const shouldDisableDefault =
        keybinding && keybinding.isDefault && requiresChange;
      if (shouldDisableDefault) {
        // If the replaced keybinding is the default, disable it.
        newUserShortcuts.push(
          this._shortcutFromTarget(target, keybinding.keys, {
            disabled: true,
            preventDefault: keybinding.preventDefault
          })
        );
      }
      // If the new keys are equivalent to the current ones there is nothing
      // to change; adding an override would duplicate the existing keybinding.
      if (keys.length !== 0 && requiresChange) {
        newUserShortcuts.push(
          this._shortcutFromTarget(target, keys, {
            preventDefault: keybinding?.preventDefault
          })
        );
      }
    }
    await settings.set('shortcuts', newUserShortcuts as any);
  }

  private _setShortcutKeys(
    shortcut: CommandRegistry.IKeyBindingOptions,
    keys: string[]
  ): CommandRegistry.IKeyBindingOptions {
    const keyField = this._platformKeys(shortcut);
    return {
      ...shortcut,
      [keyField]: keys
    };
  }

  private _shortcutFromTarget(
    target: IShortcutTarget,
    keys: string[],
    options: { disabled?: boolean; preventDefault?: boolean } = {}
  ): ShortcutOverride {
    const shortcut: ShortcutOverride = {
      command: target.command,
      selector: target.selector,
      keys
    };
    if (target.args && !JSONExt.deepEqual(target.args, {})) {
      shortcut.args = target.args;
    }
    if (options.disabled) {
      shortcut.disabled = true;
    }
    if (options.preventDefault !== undefined) {
      shortcut.preventDefault = options.preventDefault;
    }
    return shortcut;
  }

  private _platformKeys(
    shortcut: CommandRegistry.IKeyBindingOptions
  ): 'keys' | 'winKeys' | 'macKeys' | 'linuxKeys' {
    if (Platform.IS_WIN && shortcut.winKeys) {
      return 'winKeys';
    }
    if (Platform.IS_MAC && shortcut.macKeys) {
      return 'macKeys';
    }
    if (!Platform.IS_WIN && !Platform.IS_MAC && shortcut.linuxKeys) {
      return 'linuxKeys';
    }
    return 'keys';
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
          toggleSelectors={this.toggleSelectors}
          showSelectors={this.state.showSelectors}
          showAddCommand={this.state.showAddCommand}
          updateSort={this.updateSort}
          currentSort={this.state.currentSort}
          toggleAddCommandRow={this.toggleAddCommandRow}
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
              saveShortcut: this.saveNewShortcut
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

  private _isMounted = false;
  private _newShortcutItem: NewShortcutItem;
  private _settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout> | null =
    null;
}
