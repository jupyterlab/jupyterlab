/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import type {
  ICustomOptions,
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';
import type { IShortcutItemProps } from './ShortcutItem';

/** Props for ShortcutItem component */
export interface INewShortcutItemProps {
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  showSelectors: boolean;
  external: IShortcutUI.IExternalBundle;
}

export class NewShortcutItem implements IShortcutItemProps {
  constructor(options: INewShortcutItemProps) {
    this._shortcut = {
      id: 'new shortcut',
      command: '',
      keybindings: [],
      selector: 'body',
      category: '',
      args: {}
    };

    this.findConflictsFor = options.findConflictsFor;
    this.showSelectors = options.showSelectors;
    this.external = options.external;
  }

  showSelectors: boolean;

  external: IShortcutUI.IExternalBundle;

  get shortcut(): IShortcutTarget {
    return this._shortcut;
  }

  get changed(): ISignal<NewShortcutItem, void> {
    return this._changed;
  }

  /**
   * Reset the shortcut.
   */
  reset = () => {
    this._shortcut = {
      id: 'new shortcut',
      command: '',
      keybindings: [],
      selector: 'body',
      category: '',
      args: {}
    };
    this._changed.emit();
  };

  /**
   * Add a new keybinding.
   */
  addKeybinding = async (target: IShortcutTarget, keys: string[]) => {
    this._shortcut.keybindings.push({ keys, isDefault: false });
    this._changed.emit();
  };

  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   */
  replaceKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding,
    keys: string[]
  ): Promise<void> => {
    const index = this._shortcut.keybindings.findIndex(
      binding => binding.keys === keybinding.keys
    );
    if (index > -1) {
      this._shortcut.keybindings[index] = { keys, isDefault: false };
    } else {
      void this.addKeybinding(target, keys);
    }
    this._changed.emit();
  };

  /**
   * Delete a single keybinding for given shortcut target.
   */
  deleteKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding
  ): Promise<void> => {
    const index = this._shortcut.keybindings.findIndex(
      binding => binding.keys === keybinding.keys
    );
    if (index > -1) {
      this._shortcut.keybindings.splice(index, 1);
      this._changed.emit();
    }
  };

  /**
   * Reset keybindings for given target to defaults.
   */
  resetKeybindings = async (target: IShortcutTarget): Promise<void> => {
    this._shortcut = {
      ...this._shortcut,
      keybindings: []
    };
    this._changed.emit();
  };

  /**
   * Update the selector and args for a user defined shortcut.
   */
  setCustomOptions = async (
    target: IShortcutTarget,
    options: ICustomOptions
  ): Promise<boolean> => {
    this._shortcut = {
      ...this._shortcut,
      selector: options.selector,
      args: options.args
    };
    this._changed.emit();
    return true;
  };

  updateCommand = (command: string, category: string): void => {
    this._shortcut = {
      ...this._shortcut,
      command,
      category
    };
    this._changed.emit();
  };

  private _shortcut: IShortcutTarget;
  findConflictsFor: (keys: string[], selector: string) => IShortcutTarget[];
  private _changed = new Signal<NewShortcutItem, void>(this);
}
