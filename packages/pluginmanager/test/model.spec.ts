// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Token } from '@lumino/coreutils';
import { simulate } from 'simulate-event';
import type { JupyterLab } from '@jupyterlab/application';
import { PluginListModel } from '@jupyterlab/pluginmanager';
import { dismissDialog, waitForDialog } from '@jupyterlab/testing';

import { ServerConnection } from '@jupyterlab/services';

const spy = jest.spyOn(ServerConnection, 'makeRequest');

spy.mockImplementation((url, init, setting) => {
  const reply =
    url == 'http://localhost/lab/api/plugins'
      ? {
          allLocked: false,
          lockRules: []
        }
      : {
          status: 'ok',
          needs_restart: ['frontend']
        };
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => JSON.stringify(reply)
  }) as any;
});

async function chooseAcceptInDialog(
  host: HTMLElement = document.body,
  timeout: number = 250
): Promise<void> {
  await waitForDialog(host, timeout);

  const node = host.getElementsByClassName('jp-mod-accept')[0];

  if (node) {
    simulate(node as HTMLElement, 'click', { button: 1 });
  }
}

describe('@jupyterlab/pluginmanager', () => {
  describe('PluginListModel', () => {
    let providerPlugin: JupyterLab.IPluginInfo;
    let dependantPlugin: JupyterLab.IPluginInfo;
    let optionalUserPlugin: JupyterLab.IPluginInfo;

    beforeEach(() => {
      const token = new Token('A token');
      providerPlugin = {
        id: 'extension:provider-plugin',
        extension: 'extension',
        enabled: true,
        description: '',
        autoStart: true,
        requires: [],
        optional: [],
        provides: token
      };
      dependantPlugin = {
        id: 'extension:plugin-which-depends-on-provider',
        extension: 'extension',
        enabled: true,
        description: '',
        autoStart: true,
        requires: [token],
        optional: [],
        provides: null
      };
      optionalUserPlugin = {
        id: 'extension:plugin-which-optionally-uses-provider',
        extension: 'extension',
        enabled: true,
        description: '',
        autoStart: true,
        requires: [],
        optional: [token],
        provides: null
      };
    });

    describe('#constructor()', () => {
      it('should create a model', () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: []
          }
        });
        expect(model).toBeInstanceOf(PluginListModel);
      });
    });

    describe('#disable()', () => {
      it('should bail if not disclaimed', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin]
          }
        });
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        try {
          await model.disable(entry);
        } catch {
          // no-op
        }
        expect(entry.enabled).toBe(true);
      });

      it('should bail on entry with dependants', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin, dependantPlugin]
          }
        });
        model.isDisclaimed = true;
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        await model.disable(entry);
        await chooseAcceptInDialog();
        expect(model.actionError).toBe(null);
        expect(entry.enabled).toBe(true);
      });
      it('should bail on entry with optionals if user rejects', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin, optionalUserPlugin]
          }
        });
        model.isDisclaimed = true;
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        await Promise.all([model.disable(entry), dismissDialog()]);
        expect(model.actionError).toBe(null);
        expect(entry.enabled).toBe(true);
      });
      it('should disable entry with optionals if user accepts', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin, optionalUserPlugin]
          }
        });
        model.isDisclaimed = true;
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        await Promise.all([model.disable(entry), chooseAcceptInDialog()]);
        expect(model.actionError).toBe(null);
        expect(entry.enabled).toBe(false);
      });
    });

    describe('#enable()', () => {
      it('should bail if not disclaimed', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin]
          }
        });
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        entry.enabled = false;
        try {
          await model.enable(entry);
        } catch {
          // no-op
        }
        expect(entry.enabled).toBe(false);
      });
      it('should enable given entry', async () => {
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [providerPlugin, optionalUserPlugin]
          }
        });
        model.isDisclaimed = true;
        await model.ready;
        const entry = { ...providerPlugin, locked: false };
        entry.enabled = false;
        await model.enable(entry);
        expect(model.actionError).toBe(null);
        expect(entry.enabled).toBe(true);
      });
    });

    describe('#available', () => {
      it('should mark plugins as locked if server has all plugins locked', async () => {
        spy.mockImplementation((..._) => {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              JSON.stringify({
                allLocked: true,
                lockRules: []
              })
          }) as any;
        });
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [
              providerPlugin,
              dependantPlugin,
              optionalUserPlugin
            ]
          }
        });
        await model.ready;
        expect(model.available.every(plugin => plugin.locked)).toBe(true);
      });
      it('should mark individual plugins as locked', async () => {
        spy.mockImplementation((..._) => {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              JSON.stringify({
                allLocked: false,
                lockRules: [providerPlugin.id]
              })
          }) as any;
        });
        const model = new PluginListModel({
          pluginData: {
            availablePlugins: [
              providerPlugin,
              dependantPlugin,
              optionalUserPlugin
            ]
          }
        });
        await model.ready;
        expect(
          model.available.find(plugin => plugin.id === providerPlugin.id)!
            .locked
        ).toBe(true);
        expect(
          model.available
            .filter(plugin => plugin.id !== providerPlugin.id)
            .some(plugin => plugin.locked)
        ).toBe(false);
      });
    });
  });
});
