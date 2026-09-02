// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { JupyterLab, LayoutRestorer } from '@jupyterlab/application';
import { StateDB } from '@jupyterlab/statedb';
import { signalToPromise } from '@jupyterlab/testing';
import { CommandRegistry } from '@lumino/commands';
import { PromiseDelegate } from '@lumino/coreutils';
import type { DockPanel } from '@lumino/widgets';

describe('plugins', () => {
  let lab: JupyterLab;
  let plugin: JupyterFrontEndPlugin<void> = {
    id: '@jupyterlab/test-extension:plugin',
    description: 'Test plugin',
    autoStart: true,
    activate: async () => {
      await new Promise(f => setTimeout(f, 5000));
    }
  };

  beforeEach(() => {
    lab = new JupyterLab({});
  });

  it('autoStart plugin should be activated when application restore', async () => {
    lab.registerPlugin(plugin);
    await lab.start();
    const restorer = new LayoutRestorer({
      connector: new StateDB(),
      first: Promise.resolve<void>(void 0),
      registry: new CommandRegistry()
    });
    const mode: DockPanel.Mode = 'multiple-document';
    void lab.shell.restoreLayout(mode, restorer);
    await lab.restored;
    expect(
      lab.isPluginActivated('@jupyterlab/test-extension:plugin')
    ).toBeTruthy();
  });

  it('autoStart=false plugin should never be activated', async () => {
    plugin.autoStart = false;
    lab.registerPlugin(plugin);
    await lab.start();
    const restorer = new LayoutRestorer({
      connector: new StateDB(),
      first: Promise.resolve<void>(void 0),
      registry: new CommandRegistry()
    });
    const mode: DockPanel.Mode = 'multiple-document';
    void lab.shell.restoreLayout(mode, restorer);
    await lab.restored;
    expect(
      lab.isPluginActivated('@jupyterlab/test-extension:plugin')
    ).toBeFalsy();
    await lab.allPluginsActivated;
    expect(
      lab.isPluginActivated('@jupyterlab/test-extension:plugin')
    ).toBeFalsy();
  });

  it('deferred plugin should not be activated right after application restore', async () => {
    plugin.autoStart = 'defer';
    lab.registerPlugin(plugin);
    await lab.start();
    const restorer = new LayoutRestorer({
      connector: new StateDB(),
      first: Promise.resolve<void>(void 0),
      registry: new CommandRegistry()
    });
    const mode: DockPanel.Mode = 'multiple-document';
    void lab.shell.restoreLayout(mode, restorer);
    await lab.restored;
    expect(
      lab.isPluginActivated('@jupyterlab/test-extension:plugin')
    ).toBeFalsy();
    await lab.allPluginsActivated;
    expect(
      lab.isPluginActivated('@jupyterlab/test-extension:plugin')
    ).toBeTruthy();
  });
});

describe('JupyterLab.Info', () => {
  function pluginInfo(id: string, enabled: boolean): JupyterLab.IPluginInfo {
    return {
      id,
      description: '',
      requires: [],
      optional: [],
      provides: null,
      autoStart: true,
      enabled,
      extension: id.split(':')[0]
    };
  }

  async function flushPromises(): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(resolve, 0);
    });
  }

  describe('#pendingAvailablePlugins', () => {
    it('should add the plugins and emit once they are known', async () => {
      const pending = new PromiseDelegate<JupyterLab.IPluginInfo[]>();
      const info = new JupyterLab.Info({
        availablePlugins: [pluginInfo('@jupyterlab/a-extension:plugin', true)],
        disabled: { patterns: ['@jupyterlab/b-extension'], matches: [] },
        pendingAvailablePlugins: pending.promise
      });
      const changed = signalToPromise(info.availablePluginsChanged);

      pending.resolve([
        pluginInfo('@jupyterlab/b-extension:plugin', false),
        pluginInfo('@jupyterlab/c-extension:plugin', true)
      ]);
      const [sender] = await changed;

      expect(sender).toBe(info);
      expect(info.availablePlugins.map(plugin => plugin.id)).toEqual([
        '@jupyterlab/a-extension:plugin',
        '@jupyterlab/b-extension:plugin',
        '@jupyterlab/c-extension:plugin'
      ]);
      expect(info.disabled.matches).toEqual(['@jupyterlab/b-extension:plugin']);
    });

    it('should not repeat a disabled plugin id', async () => {
      const info = new JupyterLab.Info({
        disabled: { patterns: [], matches: ['@jupyterlab/b-extension:plugin'] },
        pendingAvailablePlugins: Promise.resolve([
          pluginInfo('@jupyterlab/b-extension:plugin', false)
        ])
      });
      await signalToPromise(info.availablePluginsChanged);

      expect(info.disabled.matches).toEqual(['@jupyterlab/b-extension:plugin']);
    });

    it('should not emit when no plugin was pending', async () => {
      const info = new JupyterLab.Info({
        pendingAvailablePlugins: Promise.resolve([])
      });
      const slot = jest.fn();
      info.availablePluginsChanged.connect(slot);
      await flushPromises();

      expect(slot).not.toHaveBeenCalled();
      expect(info.availablePlugins).toEqual([]);
    });

    it('should not add the plugins to the default info', async () => {
      const info = new JupyterLab.Info({
        pendingAvailablePlugins: Promise.resolve([
          pluginInfo('@jupyterlab/a-extension:plugin', true)
        ])
      });
      await signalToPromise(info.availablePluginsChanged);

      expect(info.availablePlugins).toHaveLength(1);
      expect(JupyterLab.defaultInfo.availablePlugins).toEqual([]);
    });

    it('should report a failure to get the plugins', async () => {
      const error = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const slot = jest.fn();
      const info = new JupyterLab.Info({
        pendingAvailablePlugins: Promise.reject(new Error('not loaded'))
      });
      info.availablePluginsChanged.connect(slot);
      await flushPromises();

      expect(error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ message: 'not loaded' })
      );
      expect(slot).not.toHaveBeenCalled();
      error.mockRestore();
    });
  });
});
