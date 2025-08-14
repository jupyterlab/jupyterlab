// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import * as plugin from '@jupyterlab/shortcuts-extension';
import { IDataConnector } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { Platform } from '@lumino/domutils';
import { signalToPromise } from '@jupyterlab/testing';

import pluginSchema from '../schema/shortcuts.json';

describe('@jupyterlab/shortcut-extension', () => {
  const pluginId = 'test-plugin:settings';

  let dummySettings: ISettingRegistry.IPlugin;

  beforeEach(() => {
    dummySettings = {
      data: {
        composite: {},
        user: {}
      },
      id: plugin.default.id,
      raw: '{}',
      schema: pluginSchema as any,
      version: 'test'
    };
  });

  describe('shorcuts list', () => {
    it('should ignored Cmd on non-Mac platform', async () => {
      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.shortcuts': [
            {
              command: 'notebook:run-cell',
              keys: ['Ctrl Enter'],
              selector: '.jp-Notebook.jp-mod-editMode'
            },
            {
              command: 'notebook:run-cell',
              keys: ['Cmd Enter'],
              selector: '.jp-Notebook.jp-mod-editMode'
            }
          ],
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            case plugin.default.id:
              return dummySettings;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector,
        timeout: Infinity
      });

      await settingRegistry.load(bar.id);

      void plugin.default.activate(
        {
          commands: new CommandRegistry()
        } as any,
        settingRegistry
      );

      const settings = await settingRegistry.load(plugin.default.id);
      const shortcuts = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];

      expect(shortcuts).toHaveLength(Platform.IS_MAC ? 2 : 1);
    });

    it('should respect default shortcuts (e.g. from `overrides.json`)', async () => {
      const shared: Omit<ISettingRegistry.IPlugin, 'id'> = {
        data: {
          composite: {},
          user: {}
        },
        raw: '{}',
        version: 'test'
      };
      const foo = {
        ...shared,
        id: 'foo:settings',
        schema: {
          type: 'object',
          'jupyter.lab.shortcuts': [
            {
              command: 'application:close',
              keys: ['Ctrl W'],
              selector: 'body'
            },
            {
              command: 'application:close-all',
              keys: ['Alt W'],
              selector: 'body'
            }
          ]
        }
      };
      const bar = {
        ...shared,
        id: 'bar:settings',
        schema: {
          type: 'object',
          'jupyter.lab.shortcuts': [
            {
              command: 'console:create',
              keys: ['Ctrl T'],
              selector: 'body'
            },
            {
              command: 'console:inject',
              keys: ['Ctrl I'],
              selector: 'body'
            }
          ]
        }
      };
      const defaults = {
        ...shared,
        id: plugin.default.id,
        schema: {
          ...(pluginSchema as any),
          properties: {
            shortcuts: {
              default: [
                {
                  command: 'application:close',
                  keys: ['Ctrl W'],
                  selector: 'body',
                  disabled: true
                },
                {
                  command: 'console:inject',
                  keys: ['Ctrl J'],
                  selector: 'body'
                },
                {
                  command: 'help:open',
                  keys: ['Ctrl H'],
                  selector: 'body'
                }
              ]
            }
          }
        }
      };

      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case foo.id:
              return foo;
            case bar.id:
              return bar;
            case defaults.id:
              return defaults;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      void plugin.default.activate(
        {
          commands: new CommandRegistry()
        } as any,
        settingRegistry
      );

      // Note: we are also testing that the shortcuts overrides are not lost
      // when settings are fetched before or after the shortcuts settings.
      await settingRegistry.load(foo.id);
      const settings = await settingRegistry.load(plugin.default.id);
      await settingRegistry.load(bar.id);

      // Ensure the signal about loading has already propagated to listeners
      await signalToPromise(settingRegistry.pluginChanged);

      const shortcuts = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];

      const commandsWithShortcuts = shortcuts.map(shortcut => shortcut.command);

      // `application:close` was disabled by override but `application:close-all` was not
      expect(commandsWithShortcuts).not.toContain('application:close');
      expect(commandsWithShortcuts).toContain('application:close-all');

      // `help:open` was added by override
      expect(commandsWithShortcuts).toContain('help:open');

      // `console:inject` should now be accessible with both Ctrl + I and Ctrl + J
      const injectBindings = shortcuts.filter(
        s => s.command === 'console:inject'
      );
      expect(injectBindings.map(s => s.keys[0])).toContain('Ctrl J');
      expect(injectBindings.map(s => s.keys[0])).toContain('Ctrl I');

      // `console:create` should not be touched by the override
      const createBindings = shortcuts.filter(
        s => s.command === 'console:create'
      );
      expect(createBindings.length).toEqual(1);
      expect(createBindings[0].keys[0]).toEqual('Ctrl T');
    });

    it('should allow disabling a default shortcut and registering a different shortcut with the same keys', async () => {
      const shared: Omit<ISettingRegistry.IPlugin, 'id'> = {
        data: {
          composite: {},
          user: {}
        },
        raw: '{}',
        version: 'test'
      };
      const foo = {
        ...shared,
        id: 'foo:settings',
        schema: {
          type: 'object',
          'jupyter.lab.shortcuts': [
            {
              command: 'application:close',
              keys: ['Ctrl W'],
              selector: 'body'
            },
            {
              command: 'application:close-all',
              keys: ['Alt W'],
              selector: 'body'
            }
          ]
        }
      };
      const defaults = {
        ...shared,
        id: plugin.default.id,
        schema: {
          ...(pluginSchema as any),
          properties: {
            shortcuts: {
              default: []
            }
          }
        },
        raw: JSON.stringify({
          shortcuts: [
            {
              command: 'application:close',
              keys: ['Ctrl W'],
              selector: 'body',
              disabled: true
            },
            {
              command: 'application:close-all',
              keys: ['Ctrl W'],
              selector: 'body'
            }
          ]
        })
      };

      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case foo.id:
              return foo;
            case defaults.id:
              return defaults;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      void plugin.default.activate(
        {
          commands: new CommandRegistry()
        } as any,
        settingRegistry
      );

      // Note: we are also testing that the shortcuts overrides are not lost
      // when settings are fetched before or after the shortcuts settings.
      await settingRegistry.load(foo.id);
      const settings = await settingRegistry.load(plugin.default.id);

      // Ensure the signal about loading has already propagated to listeners
      await signalToPromise(settingRegistry.pluginChanged);

      const shortcuts = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];

      const commandsWithShortcuts = shortcuts.map(shortcut => shortcut.command);

      // `application:close` was disabled by override but `application:close-all` was not
      expect(commandsWithShortcuts).not.toContain('application:close');
      expect(commandsWithShortcuts).toContain('application:close-all');

      // `application:close-all` should now be accessible with both Alt + W and Ctrl + W
      const closeAllBindings = shortcuts.filter(
        s => s.command === 'application:close-all'
      );
      expect(closeAllBindings.map(s => s.keys[0])).toContain('Alt W');
      expect(closeAllBindings.map(s => s.keys[0])).toContain('Ctrl W');
    });

    it('should ignore colliding shortcuts', async () => {
      const pluginId = 'test-plugin:settings';
      const bar: ISettingRegistry.IPlugin = {
        data: {
          composite: {},
          user: {}
        },
        id: pluginId,
        raw: '{}',
        schema: {
          'jupyter.lab.shortcuts': [
            {
              command: 'notebook:run-cell',
              keys: ['Accel Enter'],
              selector: '.jp-Notebook.jp-mod-editMode'
            },
            {
              command: 'another-colliding-command',
              keys: ['Accel Enter'],
              selector: '.jp-Notebook.jp-mod-editMode'
            }
          ],
          type: 'object'
        },
        version: 'test'
      };

      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockImplementation((id: string) => {
          switch (id) {
            case bar.id:
              return bar;
            case plugin.default.id:
              return dummySettings;
            default:
              return {};
          }
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };

      const settingRegistry = new SettingRegistry({
        connector
      });

      await settingRegistry.load(bar.id);

      void plugin.default.activate(
        {
          commands: new CommandRegistry()
        } as any,
        settingRegistry
      );

      const settings = await settingRegistry.load(plugin.default.id);
      const shortcuts = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];

      expect(shortcuts).toHaveLength(1);
    });
  });
});
