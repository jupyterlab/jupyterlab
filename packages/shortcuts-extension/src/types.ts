/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import type { CommandRegistry } from '@lumino/commands';
import type { ISignal } from '@lumino/signaling';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { ITranslator } from '@jupyterlab/translation';

/**
 * Identifiers of commands registered by shortcuts UI.
 */
export namespace CommandIDs {
  export const editBinding = 'shortcuts:edit-keybinding';
  export const addBinding = 'shortcuts:add-keybinding';
  export const deleteBinding = 'shortcuts:delete-keybinding';
  export const toggleSelectors = 'shortcuts:toggle-selectors';
  export const resetAll = 'shortcuts:reset-all';
}

/**
 * The layout of shortcuts settings as defined in schema.
 */
export interface IShortcutsSettingsLayout {
  [index: string]: any;
  shortcuts?: CommandRegistry.IKeyBindingOptions[];
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
  /**
   * The CSS selector used to define the target.
   *
   * When active element, or one of its ancestors, matches the selector,
   * the target command will be invoked (by logic in the command registry).
   */
  readonly selector: string;
  /**
   * Label of the command, pre-computed for caching.
   *
   * The label should be computed with respect to the arguments (`args`)
   * and may be missing if the command did not define a label.
   */
  readonly label?: string;
  /**
   * The target category inferred from the command identifier.
   *
   * Defined as the ID part prior to the first colon (`:`).
   */
  readonly category: string;
  /**
   * Arguments associated with the shortcut target.
   *
   * Arguments influence the command label and execution.
   */
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

  interface IAddKeybindingRequest {
    /**
     * Identifier of the requested action.
     */
    request: 'add-keybinding';
    /**
     * Identifier of the shortcut target.
     */
    shortcutId: string;
  }

  interface IToggleSelectorsRequest {
    /**
     * Identifier of the requested action.
     */
    request: 'toggle-selectors';
  }

  interface IResetAllRequest {
    /**
     * Identifier of the requested action.
     */
    request: 'reset-all';
  }

  /**
   * Attributes of a request to perform an action within shortcuts UI.
   */
  export type ActionRequest =
    | IChangeKebindingRequest
    | IAddKeybindingRequest
    | IToggleSelectorsRequest
    | IResetAllRequest;

  /**
   * A bundle of actions and objects passed down from the extension entry point.
   */
  export interface IExternalBundle {
    translator: ITranslator;
    getSettings: () => Promise<
      ISettingRegistry.ISettings<IShortcutsSettingsLayout>
    >;
    commandRegistry: Omit<CommandRegistry, 'execute'>;
    actionRequested: ISignal<unknown, ActionRequest>;
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
