/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import { ShortcutRegistry } from '@jupyterlab/shortcuts-extension/lib/registry';
import { CommandRegistry } from '@lumino/commands';
import { IDataConnector } from '@jupyterlab/statedb';
import {
  ISettingRegistry,
  SettingRegistry,
  Settings
} from '@jupyterlab/settingregistry';

import pluginSchema from '../schema/shortcuts.json';

const SHORTCUT_PLUGIN_ID = '@jupyterlab/shortcuts-extension:shortcuts';

class DummySettings extends Settings {
  constructor(protected options: Settings.IOptions) {
    super(options);
  }
  get plugin() {
    // By default this is taken from registry rather than options,
    // but using a single source of truth simplifies tests a lot.
    return this.options.plugin;
  }
}

describe('@jupyterlab/shortcut-extension', () => {
  describe('ShortcutRegistry', () => {
    let commandRegistry: CommandRegistry;
    const data = {
      composite: { shortcuts: [] as CommandRegistry.IKeyBindingOptions[] },
      user: { shortcuts: [] as CommandRegistry.IKeyBindingOptions[] }
    };
    let options: ShortcutRegistry.IOptions;

    beforeEach(async () => {
      commandRegistry = new CommandRegistry();
      data.composite.shortcuts.length = 0;
      data.user.shortcuts.length = 0;
      const plugin = {
        data,
        id: SHORTCUT_PLUGIN_ID,
        raw: '{}',
        schema: pluginSchema,
        version: 'test'
      };
      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn(),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };
      const settingRegistry = new SettingRegistry({ connector });
      const settings = new DummySettings({
        plugin: plugin as any,
        registry: settingRegistry
      });
      options = { commandRegistry, settings };
      commandRegistry.addCommand('test:command', {
        execute: () => {},
        label: args => `Test ${args.option}`
      });
    });

    describe('#constructor()', () => {
      it('should create separate targets for different arguments', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl 1'],
          selector: 'body',
          args: { option: 1 }
        });
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl 2'],
          selector: 'body',
          args: { option: 2 }
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const targets = [...shortcutRegistry.values()];
        expect(targets).toHaveLength(2);
        expect(targets[0].label).toBe('Test 1');
        expect(targets[1].label).toBe('Test 2');
      });

      it('should aggregate keybindings by shortcut target', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl Z'],
          selector: 'body'
        });
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Z', 'Z'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const targets = [...shortcutRegistry.values()];
        expect(targets).toHaveLength(1);
        expect(targets[0].keybindings).toHaveLength(2);
      });

      it('should mark keybindings created by user as non-default', () => {
        const shortcut = {
          command: 'test:command',
          keys: ['Ctrl W'],
          selector: 'body'
        };
        data.composite.shortcuts.push(shortcut);
        data.user.shortcuts.push(shortcut);
        const shortcutRegistry = new ShortcutRegistry(options);
        const target = [...shortcutRegistry.values()][0];
        expect(target.keybindings[0].isDefault).toBe(false);
      });

      it('should mark default keybindings as default', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl W'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const target = [...shortcutRegistry.values()][0];
        expect(target.keybindings[0].isDefault).toBe(true);
      });
    });

    describe('#findConflictsFor()', () => {
      it('should return no conflicts when no shortcuts are defined', () => {
        const shortcutRegistry = new ShortcutRegistry(options);
        const conflicts = shortcutRegistry.findConflictsFor([], '');
        expect(conflicts).toBeInstanceOf(Array);
        expect(conflicts).toHaveLength(0);
      });

      it('should return conflicts for existing shortcuts', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl W'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const conflicts = shortcutRegistry.findConflictsFor(['Ctrl W'], 'body');
        expect(conflicts).toHaveLength(1);
      });

      it('should return conflicts for individual chords', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['X'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const conflicts = shortcutRegistry.findConflictsFor(['X', 'X'], 'body');
        expect(conflicts).toHaveLength(1);
      });

      it('should return no conflicts if selectors differ', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl W'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const conflicts = shortcutRegistry.findConflictsFor(['Ctrl W'], 'a');
        expect(conflicts).toHaveLength(0);
      });

      it('should return no conflicts if keys differ', () => {
        data.composite.shortcuts.push({
          command: 'test:command',
          keys: ['Ctrl W'],
          selector: 'body'
        });
        const shortcutRegistry = new ShortcutRegistry(options);
        const conflicts = shortcutRegistry.findConflictsFor(['Ctrl Z'], 'body');
        expect(conflicts).toHaveLength(0);
      });
    });
  });
});
