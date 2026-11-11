// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BaseSettings, SettingRegistry } from '@jupyterlab/settingregistry';
import * as plugin from '@jupyterlab/shortcuts-extension';
import type { IDataConnector } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { Platform } from '@lumino/domutils';
import { signalToPromise } from '@jupyterlab/testing';

import consoleSchema from '../../console-extension/schema/tracker.json';
import fileEditorSchema from '../../fileeditor-extension/schema/plugin.json';
import notebookSchema from '../../notebook-extension/schema/tracker.json';
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
    async function registerRShortcuts(): Promise<CommandRegistry> {
      const schemas = [consoleSchema, fileEditorSchema, notebookSchema];
      const plugins: ISettingRegistry.IPlugin[] = schemas.map((schema, i) => ({
        id: `test-plugin-${i}:settings`,
        data: { composite: {}, user: {} },
        raw: '{}',
        schema: {
          type: 'object',
          'jupyter.lab.shortcuts': schema['jupyter.lab.shortcuts']
        },
        version: 'test'
      }));
      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockResolvedValue(dummySettings),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };
      const settingRegistry = new SettingRegistry({ connector, plugins });
      const commands = new CommandRegistry();

      await plugin.default.activate(
        { commands } as JupyterFrontEnd,
        settingRegistry,
        null,
        null,
        null
      );
      return commands;
    }

    it('should register R operator shortcuts for consoles, file editors and notebooks', async () => {
      const commands = await registerRShortcuts();

      for (const [widgetClass, command] of [
        ['jp-CodeConsole-promptCell', 'console:replace-selection'],
        ['jp-FileEditor', 'fileeditor:replace-selection'],
        ['jp-Notebook jp-mod-editMode', 'notebook:replace-selection']
      ]) {
        const widget = document.createElement('div');
        widget.className = widgetClass;
        const editor = document.createElement('div');
        widget.appendChild(editor);
        for (const [keys, text] of [
          ['Alt -', '<- '],
          ['Accel Shift M', '%>% ']
        ]) {
          const bindings = commands.keyBindings.filter(
            binding =>
              binding.keys.join(' ') ===
              CommandRegistry.normalizeKeys({
                command,
                keys: [keys],
                selector: 'body'
              }).join(' ')
          );
          editor.dataset.jpEditorLanguage = 'r';
          expect(
            bindings.filter(binding => editor.matches(binding.selector))
          ).toEqual([expect.objectContaining({ command, args: { text } })]);
          editor.dataset.jpEditorLanguage = 'python';
          expect(
            bindings.filter(binding => editor.matches(binding.selector))
          ).toEqual([]);
        }
      }
    });

    it('should not register R operator shortcuts for executed console cells', async () => {
      const commands = await registerRShortcuts();
      const widget = document.createElement('div');
      widget.className = 'jp-CodeConsole';
      const cell = document.createElement('div');
      cell.className = 'jp-CodeCell';
      const editor = document.createElement('div');
      editor.dataset.jpEditorLanguage = 'r';
      cell.appendChild(editor);
      widget.appendChild(cell);

      expect(
        commands.keyBindings.filter(
          binding =>
            binding.command === 'console:replace-selection' &&
            editor.matches(binding.selector)
        )
      ).toEqual([]);
    });

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
        { commands: new CommandRegistry() } as any,
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
        { commands: new CommandRegistry() } as any,
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
        { commands: new CommandRegistry() } as any,
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
        { commands: new CommandRegistry() } as any,
        settingRegistry
      );

      const settings = await settingRegistry.load(plugin.default.id);
      const shortcuts = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];

      expect(shortcuts).toHaveLength(1);
    });

    /**
     * Load the shortcuts settings with the given default and user shortcuts.
     */
    async function loadShortcuts(
      defaults: ISettingRegistry.IShortcut[],
      user: ISettingRegistry.IShortcut[]
    ): Promise<ISettingRegistry.ISettings> {
      const extension: ISettingRegistry.IPlugin = {
        id: 'test-extension:plugin',
        data: { composite: {}, user: {} },
        raw: '{}',
        schema: { type: 'object', 'jupyter.lab.shortcuts': defaults },
        version: 'test'
      };
      const connector: IDataConnector<ISettingRegistry.IPlugin, string> = {
        fetch: jest.fn().mockResolvedValue({
          ...dummySettings,
          raw: JSON.stringify({ shortcuts: user })
        }),
        list: jest.fn(),
        save: jest.fn(),
        remove: jest.fn()
      };
      const settingRegistry = new SettingRegistry({
        connector,
        plugins: [extension]
      });
      await plugin.default.activate(
        { commands: new CommandRegistry() } as JupyterFrontEnd,
        settingRegistry,
        null,
        null,
        null
      );
      return settingRegistry.load(plugin.default.id);
    }

    const closeTab = {
      command: 'application:close',
      keys: ['Alt W'],
      selector: '.jp-LabShell'
    };

    it('should migrate the selectors of the user shortcuts', async () => {
      const settings = await loadShortcuts(
        [],
        [
          { ...closeTab, selector: '.jp-Activity', disabled: true },
          { ...closeTab, keys: ['Ctrl Alt W'], selector: '.jp-Activity' }
        ]
      );
      // The shortcuts editor compares these with the composite shortcuts.
      const user = settings.get('shortcuts')
        .user as ISettingRegistry.IShortcut[];
      expect(user.map(shortcut => shortcut.selector)).toEqual([
        '.jp-LabShell',
        '.jp-LabShell'
      ]);
    });

    it('should disable a default with a user shortcut stored with the old selector', async () => {
      const settings = await loadShortcuts(
        [closeTab],
        [{ ...closeTab, selector: '.jp-Activity', disabled: true }]
      );
      expect(settings.get('shortcuts').composite).toEqual([]);
    });

    it('should disable a default with a default stored with the old selector', async () => {
      // The shortcuts of `overrides.json` are part of the defaults.
      const settings = await loadShortcuts(
        [closeTab, { ...closeTab, selector: '.jp-Activity', disabled: true }],
        []
      );
      expect(settings.get('shortcuts').composite).toEqual([]);
    });

    it('should migrate only the selectors of the two close commands', async () => {
      const settings = await loadShortcuts(
        [],
        [
          {
            command: 'filemenu:close-and-cleanup',
            keys: ['Ctrl Shift Q'],
            selector: '.jp-Activity'
          },
          {
            command: 'other:command',
            keys: ['Alt Y'],
            selector: '.jp-Activity'
          },
          { ...closeTab, keys: ['Alt Z'], selector: '.jp-Activity .custom' }
        ]
      );
      const composite = settings.get('shortcuts')
        .composite as ISettingRegistry.IShortcut[];
      expect(composite.map(shortcut => shortcut.selector)).toEqual([
        '.jp-LabShell',
        '.jp-Activity',
        '.jp-Activity .custom'
      ]);
    });

    it('should keep the options of a migrated shortcut', async () => {
      const settings = await loadShortcuts(
        [],
        [
          {
            ...closeTab,
            selector: '.jp-Activity',
            args: { foo: 'bar' },
            preventDefault: false
          }
        ]
      );
      expect(settings.get('shortcuts').composite).toEqual([
        { ...closeTab, args: { foo: 'bar' }, preventDefault: false }
      ]);
    });
  });

  describe('shortcuts schema', () => {
    it('should preserve `disabled` when reifying default shortcuts', () => {
      // If `disabled` is dropped, disabled defaults render identically to
      // the shortcuts they disable in the JSON Settings Editor.
      const schema = JSON.parse(JSON.stringify(pluginSchema));
      schema.properties.shortcuts.default = [
        {
          command: 'notebook:change-cell-to-code',
          keys: ['Y'],
          selector: '.jp-Notebook'
        },
        {
          command: 'notebook:change-cell-to-code',
          keys: ['Y'],
          selector: '.jp-Notebook',
          disabled: true
        }
      ];

      const defaults = new BaseSettings({ schema }).default(
        'shortcuts'
      ) as ISettingRegistry.IShortcut[];

      expect(defaults).toHaveLength(2);
      expect(defaults[0].disabled).toBeUndefined();
      expect(defaults[1].disabled).toBe(true);
    });
  });
});
