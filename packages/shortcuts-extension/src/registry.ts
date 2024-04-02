/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import {
  IKeybinding,
  IShortcutRegistry,
  IShortcutsSettingsLayout,
  IShortcutTarget
} from './types';

/**
 * Shortcut registry used by Shortcut UI component.
 */
export class ShortcutRegistry
  extends Map<string, IShortcutTarget>
  implements IShortcutRegistry
{
  constructor(options: ShortcutRegistry.IOptions) {
    super();
    const { settings, commandRegistry } = options;

    const userBindings = settings.user.shortcuts ?? [];
    const setByUser = new Set(
      userBindings.map(this._computeKeybindingId.bind(this))
    );

    const luminoKeybindings = settings.composite.shortcuts ?? [];

    for (const shortcut of luminoKeybindings) {
      const targetKey = this._computeTargetId(shortcut);
      const keybindingKey = this._computeKeybindingId(shortcut);

      const keybinding: IKeybinding = {
        keys: shortcut.keys,
        isDefault: !setByUser.has(keybindingKey)
      };

      const shortcutTarget = this.get(targetKey);
      if (shortcutTarget) {
        shortcutTarget.keybindings.push(keybinding);
      } else {
        const commandParts = shortcut.command.split(':');
        const label =
          commandRegistry.label(shortcut.command, shortcut.args) ??
          (commandParts.length > 1 ? commandParts[1] : undefined);
        const category = commandParts[0];
        this.set(targetKey, {
          id: targetKey,
          selector: shortcut.selector,
          command: shortcut.command,
          category,
          label,
          args: shortcut.args,
          keybindings: [keybinding]
        });
      }
    }
  }

  /**
   * Find targets that would conflict with given keys chord under given sequence.
   */
  findConflictsFor(keys: string[], selector: string): IShortcutTarget[] {
    const checker = new KeybindingsConflictChecker({ registry: this });

    // First check the full chain
    let conflicts = checker.findConflicts(keys, selector);

    if (conflicts.length !== 0) {
      return conflicts;
    }

    // Then check each piece of the chain
    for (const binding of keys) {
      conflicts = checker.findConflicts([binding], selector);
      if (conflicts.length !== 0) {
        return conflicts;
      }
    }

    return [];
  }

  private _computeTargetId(
    shortcut: Omit<CommandRegistry.IKeyBindingOptions, 'keys'>
  ) {
    return (
      shortcut.command +
      '_' +
      shortcut.selector +
      '_' +
      JSON.stringify(shortcut.args ?? {})
    );
  }

  private _computeKeybindingId(shortcut: CommandRegistry.IKeyBindingOptions) {
    return [
      shortcut.command,
      shortcut.selector,
      JSON.stringify(shortcut.args ?? {}),
      shortcut.keys.join(' ')
    ].join('_');
  }
}

/**
 * Allows checking if a given keybinding is available, or directly conflicts with other targets.
 */
class KeybindingsConflictChecker {
  constructor(options: { registry: ShortcutRegistry }) {
    const keybindingsMap = new Map<string, IShortcutTarget[]>();
    for (const shortcutTarget of options.registry.values()) {
      for (const keybinding of shortcutTarget.keybindings) {
        const hash = this._keybindingHash(
          keybinding.keys,
          shortcutTarget.selector
        );
        const list = keybindingsMap.get(hash) ?? [];
        list.push(shortcutTarget);
        keybindingsMap.set(hash, list);
      }
    }
    this._keybindingsMap = keybindingsMap;
  }

  findConflicts(keys: string[], selector: string): IShortcutTarget[] {
    const hash = this._keybindingHash(keys, selector);
    return this._keybindingsMap.get(hash) ?? [];
  }

  private _keybindingHash(keys: string[], selector: string): string {
    return keys.join(' ') + '_' + selector;
  }

  private _keybindingsMap: Map<string, IShortcutTarget[]>;
}

/**
 * Interfaces for ShortcutRegistry class.
 */
export namespace ShortcutRegistry {
  /**
   * Initialization options for ShortcutRegistry
   */
  export interface IOptions {
    /**
     * Read-only command registry.
     */
    commandRegistry: Omit<CommandRegistry, 'execute'>;
    /**
     * Shortcut settings
     */
    settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout>;
  }
}
