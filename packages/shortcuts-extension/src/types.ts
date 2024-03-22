/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import type { CommandRegistry } from '@lumino/commands';
import type { ISignal } from '@lumino/signaling';
import type { Menu } from '@lumino/widgets';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { ITranslator } from '@jupyterlab/translation';

/**
 * Identifiers of commands registered by shortcuts UI.
 */
export namespace CommandIDs {
  export const editBinding = 'shortcuts:edit-keybinding';
  export const addBinding = 'shortcuts:add-keybinding';
  export const deleteBinding = 'shortcuts:delete-keybinding';
}

/**
 * The layout of shortcuts settings as defined in schema.
 */
export interface IShortcutsSettingsLayout {
  [index: string]: any;
  shortcuts: CommandRegistry.IKeyBindingOptions[];
}

/**
 * A keybinding assigned to a specific shortcut target.
 */
export interface IKeybinding {
  /**
   * A chain of keys that needs to be pressed to invoke the keybinding.
   *
   * Note that each "key" in the chain may correspond to multiple key strokes,
   * for example ["Ctrl+A", "X"] is a valid value.
   */
  readonly keys: string[];
  /**
   * Whether this keybinding comes from default values (schema or default overrides), or is set by user.
   */
  readonly isDefault: boolean;
}

/**
 * A shortcut target represents a unique combination of a command, selector, and arguments.
 *
 * Each shortcut target can have multiple keybindings assigned.
 */
export interface IShortcutTarget {
  /**
   * Unique key assigned to the shortcut target.
   */
  readonly id: string;
  /**
   * Identifier of the command invoked by this shortcut.
   */
  readonly command: string;
  /**
   * A list of keybindings assigned to this target.
   */
  readonly keybindings: IKeybinding[];
  readonly selector: string;
  readonly label?: string;
  readonly category: string;
  readonly args: ReadonlyPartialJSONObject | undefined;
}

/**
 * Types and interfaces specific to shortcut UI implementation.
 */
export namespace IShortcutUI {
  /**
   * The column IDs which are also used for sorting; should not be translated.
   */
  export type ColumnId =
    | 'label'
    | 'selector'
    | 'category'
    | 'source'
    | 'command';

  interface IChangeKebindingRequest {
    /**
     * Identifier of the requested action.
     */
    request: 'edit-keybinding' | 'delete-keybinding';
    /**
     * Identifier of the shortcut target.
     */
    shortcutId: string;
    /**
     * Index of the keybinding to edit.
     */
    keybinding: number;
  }

  interface IAddKeybindingReuest {
    /**
     * Identifier of the requested action.
     */
    request: 'add-keybinding';
    /**
     * Identifier of the shortcut target.
     */
    shortcutId: string;
  }

  /**
   * Attributes of a request to perform an action within shortcuts UI.
   */
  export type KebindingRequest = IChangeKebindingRequest | IAddKeybindingReuest;

  /**
   * A bundle of actions and objects passed down from the extension entry point.
   */
  export interface IExternalBundle {
    translator: ITranslator;
    getSettings: () => Promise<
      ISettingRegistry.ISettings<IShortcutsSettingsLayout>
    >;
    removeShortCut: (key: string) => Promise<void>;
    createMenu: () => Menu;
    commandRegistry: Omit<CommandRegistry, 'execute'>;
    actionRequested: ISignal<unknown, KebindingRequest>;
  }
}

/**
 * Types of `ShortcutUI` methods which are passed down to React components.
 */
export interface IShortcutUI {
  /**
   * Set the sort order for the shortcuts listing.
   */
  updateSort(value: IShortcutUI.ColumnId): void;
  /**
   * Delete a single keybinding for given shortcut target.
   */
  deleteKeybinding(
    target: IShortcutTarget,
    keybinding: IKeybinding
  ): Promise<void>;
  /**
   * Reset keybindings for given target to defaults.
   */
  resetKeybindings(target: IShortcutTarget): Promise<void>;
  /**
   * Reset all keybindings to their defaults.
   */
  resetShortcuts(): Promise<void>;
  /**
   * Toggles showing command selectors.
   */
  toggleSelectors(): void;
  /**
   * Add a new keybinding.
   */
  addKeybinding(target: IShortcutTarget, keys: string[]): Promise<void>;
  /**
   * Set the current search query
   */
  updateSearchQuery(query: string): void;
  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   */
  replaceKeybinding(
    target: IShortcutTarget,
    keybinding: IKeybinding,
    keys: string[]
  ): Promise<void>;
}

/**
 * Registry of shortcuts targets.
 */
export interface IShortcutRegistry
  extends ReadonlyMap<string, IShortcutTarget> {
  /**
   * Find targets that would conflict with given keys chord under given sequence.
   */
  findConflictsFor(keys: string[], selector: string): IShortcutTarget[];
}
