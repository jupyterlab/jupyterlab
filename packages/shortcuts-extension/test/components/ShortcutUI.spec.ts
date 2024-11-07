/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import { ShortcutUI } from '@jupyterlab/shortcuts-extension/lib/components';
import {
  IKeybinding,
  IShortcutTarget
} from '@jupyterlab/shortcuts-extension/lib/types';
import { CommandRegistry } from '@lumino/commands';
import { JSONValue, PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import {
  ISettingRegistry,
  SettingRegistry,
  Settings
} from '@jupyterlab/settingregistry';
import { IDataConnector } from '@jupyterlab/statedb';
import { nullTranslator } from '@jupyterlab/translation';
import { createRoot } from 'react-dom/client';
import React from 'react';

import pluginSchema from '../../schema/shortcuts.json';

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

  async set(key: string, value: JSONValue) {
    // Note: not setting `composite` for simplicity (we are only
    // interested in what happens to the `user` part here, because
    // generating `composite` is the responsibility of registry).
    this.options.plugin.data.user[key] = value;
  }
}

describe('@jupyterlab/shortcut-extension', () => {
  describe('ShortcutUI', () => {
    let shortcutUI: ShortcutUI;
    const data = {
      composite: { shortcuts: [] as CommandRegistry.IKeyBindingOptions[] },
      user: { shortcuts: [] as CommandRegistry.IKeyBindingOptions[] }
    };
    beforeEach(async () => {
      const commandRegistry = new CommandRegistry();
      data.composite.shortcuts.length = 0;
      data.user.shortcuts.length = 0;
      const plugin = {
        data,
        id: SHORTCUT_PLUGIN_ID,
        raw: '{}',
        schema: pluginSchema as any,
        version: 'test'
      };
      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn(),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };
      const settings = new DummySettings({
        registry: new SettingRegistry({ connector }),
        plugin: plugin as any
      });
      const ready = new PromiseDelegate<void>();
      const element = React.createElement(ShortcutUI, {
        height: 1000,
        width: 1000,
        ref: el => {
          if (el) {
            shortcutUI = el;
            ready.resolve();
          }
        },
        external: {
          getSettings: async () => {
            return settings;
          },
          translator: nullTranslator,
          commandRegistry,
          actionRequested: new Signal<unknown, any>({})
        }
      });
      const rootElement = document.createElement('div');
      document.body.appendChild(rootElement);
      const root = createRoot(rootElement);
      root.render(element);
      await ready.promise;
    });

    const registerKeybinding = (
      shortcutTarget: IShortcutTarget,
      keybinding: IKeybinding
    ) => {
      const luminoKeybinding = {
        command: shortcutTarget.command,
        keys: keybinding.keys,
        selector: shortcutTarget.selector
      };
      if (keybinding.isDefault) {
        data.composite.shortcuts.push(luminoKeybinding);
      } else {
        data.user.shortcuts.push(luminoKeybinding);
      }
    };

    describe('#addKeybinding()', () => {
      it('should add a keybinding for given target', async () => {
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [],
          args: {},
          selector: 'body',
          category: 'test'
        };
        await shortcutUI.addKeybinding(target, ['Ctrl A', 'C']);
        expect(data.user.shortcuts).toHaveLength(1);
        expect(data.user.shortcuts[0]).toEqual({
          command: 'test:command',
          keys: ['Ctrl A', 'C'],
          selector: 'body'
        });
      });
    });

    describe('#replaceKeybinding()', () => {
      it('should replace a keybinding set by user', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        expect(data.user.shortcuts[0].keys).toEqual(['Ctrl A']);
        await shortcutUI.replaceKeybinding(target, keybinding, ['Ctrl X']);
        expect(data.user.shortcuts).toHaveLength(1);
        expect(data.user.shortcuts[0].keys).toEqual(['Ctrl X']);
      });

      it('should replace a default keybinding by disabling the default and adding a new one', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: true
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        await shortcutUI.replaceKeybinding(target, keybinding, ['Ctrl X']);
        expect(data.user.shortcuts).toHaveLength(2);
        expect(data.user.shortcuts[0]).toEqual({
          command: 'test:command',
          keys: ['Ctrl A'],
          selector: 'body',
          disabled: true
        });
        expect(data.user.shortcuts[1]).toEqual({
          command: 'test:command',
          keys: ['Ctrl X'],
          selector: 'body'
        });
      });

      it('should replace the default keybinding in presence of non-default keybinding', async () => {
        const userKeybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const defaultKeybinding = {
          keys: ['Ctrl B'],
          isDefault: true
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [userKeybinding, defaultKeybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, userKeybinding);
        registerKeybinding(target, defaultKeybinding);
        await shortcutUI.replaceKeybinding(target, defaultKeybinding, [
          'Ctrl X'
        ]);
        expect(data.user.shortcuts).toHaveLength(3);
        expect(data.user.shortcuts[0]).toEqual({
          command: 'test:command',
          keys: ['Ctrl A'],
          selector: 'body'
        });
        expect(data.user.shortcuts[1]).toEqual({
          command: 'test:command',
          keys: ['Ctrl B'],
          selector: 'body',
          disabled: true
        });
        expect(data.user.shortcuts[2]).toEqual({
          command: 'test:command',
          keys: ['Ctrl X'],
          selector: 'body'
        });
      });
    });

    describe('#deleteKeybinding()', () => {
      it('should delete a default keybinding by disabling it', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: true
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        await shortcutUI.deleteKeybinding(target, keybinding);
        expect(data.user.shortcuts).toHaveLength(1);
        expect(data.user.shortcuts[0]).toEqual({
          command: 'test:command',
          keys: ['Ctrl A'],
          selector: 'body',
          disabled: true
        });
      });

      it('should remove a user keybinding by removing it from the list', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        await shortcutUI.deleteKeybinding(target, keybinding);
        expect(data.user.shortcuts).toHaveLength(0);
      });

      it('should keep other keybinding', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const otherKeybinding = {
          keys: ['Ctrl B'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding, otherKeybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        registerKeybinding(target, otherKeybinding);
        await shortcutUI.deleteKeybinding(target, keybinding);
        expect(data.user.shortcuts).toHaveLength(1);
        expect(data.user.shortcuts[0].keys[0]).toBe('Ctrl B');
      });
    });

    describe('#resetKeybindings()', () => {
      it('should clear user overrides for given shortcut target', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        await shortcutUI.resetKeybindings(target);
        expect(data.user.shortcuts).toHaveLength(0);
      });

      it('should reset default overrides for given shortcut target', async () => {
        const defaultKeybinding = {
          keys: ['Ctrl A'],
          isDefault: true
        };

        const replacedKeybinding = {
          keys: ['Ctrl D'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [defaultKeybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, defaultKeybinding);
        await shortcutUI.replaceKeybinding(target, defaultKeybinding, [
          'Ctrl D'
        ]);

        //update the target to the new keybinding.
        target.keybindings = [replacedKeybinding];

        expect(data.user.shortcuts).toHaveLength(2);
        expect(data.user.shortcuts[0]).toEqual({
          command: 'test:command',
          keys: ['Ctrl A'],
          selector: 'body',
          disabled: true
        });
        expect(data.user.shortcuts[1]).toEqual({
          command: 'test:command',
          keys: ['Ctrl D'],
          selector: 'body'
        });
        await shortcutUI.resetKeybindings(target);
        expect(data.user.shortcuts).toHaveLength(0);
      });

      it('should clear defaults overrides for given shortcut target', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: true
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        await shortcutUI.deleteKeybinding(target, keybinding);
        await shortcutUI.resetKeybindings(target);
        expect(data.user.shortcuts).toHaveLength(0);
      });

      it('should not touch user overrides for other shortcut targets', async () => {
        const keybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const target = {
          id: 'test-id',
          command: 'test:command',
          keybindings: [keybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        const differentKeybinding = {
          keys: ['Ctrl A'],
          isDefault: false
        };
        const differentTarget = {
          id: 'different-test-id',
          command: 'test:different-command',
          keybindings: [differentKeybinding],
          args: {},
          selector: 'body',
          category: 'test'
        };
        registerKeybinding(target, keybinding);
        registerKeybinding(differentTarget, differentKeybinding);
        await shortcutUI.resetKeybindings(target);
        expect(data.user.shortcuts).toHaveLength(1);
      });
    });

    describe('#sortShortcuts()', () => {
      let mockedFilteredShortcutList: IShortcutTarget[];
      beforeEach(() => {
        mockedFilteredShortcutList = [
          {
            id: '1',
            label: 'Zebra',
            command: 'Zebra',
            selector: 'Zebra',
            category: 'Zebra',
            keybindings: [{ keys: ['Ctrl+Z', 'Z'], isDefault: false }],
            args: undefined
          },
          {
            id: '2',
            label: 'Apple',
            command: 'Apple',
            selector: 'Apple',
            category: 'Apple',
            keybindings: [{ keys: ['Shift+A', 'A'], isDefault: true }],
            args: undefined
          },
          {
            id: '3',
            label: 'Banana',
            command: 'Banana',
            selector: 'Banana',
            category: 'Banana',
            keybindings: [{ keys: ['Ctrl+B', 'B'], isDefault: false }],
            args: undefined
          },
          {
            id: '4',
            label: 'Tomato',
            command: 'Tomato',
            selector: 'Tomato',
            category: 'Tomato',
            keybindings: [{ keys: ['Tab+T', 'T'], isDefault: true }],
            args: undefined
          }
        ];
      });

      it('should test sort by the `category` column', () => {
        shortcutUI.state = {
          ...shortcutUI.state,
          currentSort: 'category',
          filteredShortcutList: mockedFilteredShortcutList
        };

        expect(shortcutUI.state.filteredShortcutList[0].category).not.toBe(
          'Apple'
        );
        shortcutUI.sortShortcuts();
        expect(shortcutUI.state.filteredShortcutList[0].category).toBe('Apple');
        expect(shortcutUI.state.filteredShortcutList[1].category).toBe(
          'Banana'
        );
        expect(shortcutUI.state.filteredShortcutList[2].category).toBe(
          'Tomato'
        );
        expect(shortcutUI.state.filteredShortcutList[3].category).toBe('Zebra');
      });

      it('should test sort by the `command` column', () => {
        shortcutUI.state = {
          ...shortcutUI.state,
          currentSort: 'command',
          filteredShortcutList: mockedFilteredShortcutList
        };

        expect(shortcutUI.state.filteredShortcutList[0].label).not.toBe(
          'Apple'
        );
        shortcutUI.sortShortcuts();
        expect(shortcutUI.state.filteredShortcutList[0].label).toBe('Apple');
        expect(shortcutUI.state.filteredShortcutList[1].label).toBe('Banana');
        expect(shortcutUI.state.filteredShortcutList[2].label).toBe('Tomato');
        expect(shortcutUI.state.filteredShortcutList[3].label).toBe('Zebra');
      });

      it('should test sort by the `selector` column', () => {
        shortcutUI.state = {
          ...shortcutUI.state,
          currentSort: 'selector',
          filteredShortcutList: mockedFilteredShortcutList
        };

        expect(shortcutUI.state.filteredShortcutList[0].selector).not.toBe(
          'Apple'
        );
        shortcutUI.sortShortcuts();
        expect(shortcutUI.state.filteredShortcutList[0].selector).toBe('Apple');
        expect(shortcutUI.state.filteredShortcutList[1].selector).toBe(
          'Banana'
        );
        expect(shortcutUI.state.filteredShortcutList[2].selector).toBe(
          'Tomato'
        );
        expect(shortcutUI.state.filteredShortcutList[3].selector).toBe('Zebra');
      });

      it('should test sort by the `source` column', () => {
        shortcutUI.state = {
          ...shortcutUI.state,
          currentSort: 'source',
          filteredShortcutList: mockedFilteredShortcutList
        };

        expect(
          shortcutUI.state.filteredShortcutList[0].keybindings.every(
            k => k.isDefault
          )
            ? 'default'
            : 'other'
        ).toBe('other');
        shortcutUI.sortShortcuts();
        expect(
          shortcutUI.state.filteredShortcutList[0].keybindings.every(
            k => k.isDefault
          )
            ? 'default'
            : 'other'
        ).toBe('default');
        expect(
          shortcutUI.state.filteredShortcutList[1].keybindings.every(
            k => k.isDefault
          )
            ? 'default'
            : 'other'
        ).toBe('default');
        expect(
          shortcutUI.state.filteredShortcutList[2].keybindings.every(
            k => k.isDefault
          )
            ? 'default'
            : 'other'
        ).toBe('other');
        expect(
          shortcutUI.state.filteredShortcutList[3].keybindings.every(
            k => k.isDefault
          )
            ? 'default'
            : 'other'
        ).toBe('other');
      });
    });
  });
});
