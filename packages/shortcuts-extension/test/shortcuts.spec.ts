// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import * as plugin from '@jupyterlab/shortcuts-extension';
import { IDataConnector } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { Platform } from '@lumino/domutils';
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

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
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
      const shortcuts = (await settings.get('shortcuts')
        .composite) as ISettingRegistry.IShortcut[];

      expect(shortcuts).toHaveLength(Platform.IS_MAC ? 2 : 1);
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

      const connector: IDataConnector<
        ISettingRegistry.IPlugin,
        string,
        string,
        string
      > = {
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
      const shortcuts = (await settings.get('shortcuts')
        .composite) as ISettingRegistry.IShortcut[];

      expect(shortcuts).toHaveLength(1);
    });
  });
});
