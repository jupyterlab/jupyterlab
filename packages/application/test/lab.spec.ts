// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { JupyterLab, LayoutRestorer } from '@jupyterlab/application';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';
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

  describe('#availablePluginsAdded', () => {
    it('should add the announced plugins and emit', () => {
      const added = new Signal<unknown, JupyterLab.IPluginInfo[]>({});
      const info = new JupyterLab.Info({
        availablePlugins: [pluginInfo('@jupyterlab/a-extension:plugin', true)],
        disabled: { patterns: ['@jupyterlab/b-extension'], matches: [] },
        availablePluginsAdded: added
      });
      const slot = jest.fn();
      info.availablePluginsChanged.connect(slot);

      added.emit([
        pluginInfo('@jupyterlab/b-extension:plugin', false),
        pluginInfo('@jupyterlab/c-extension:plugin', true)
      ]);

      expect(slot).toHaveBeenCalledTimes(1);
      expect(slot.mock.calls[0][0]).toBe(info);
      expect(info.availablePlugins.map(plugin => plugin.id)).toEqual([
        '@jupyterlab/a-extension:plugin',
        '@jupyterlab/b-extension:plugin',
        '@jupyterlab/c-extension:plugin'
      ]);
      expect(info.disabled.matches).toEqual(['@jupyterlab/b-extension:plugin']);
    });

    it('should add plugins announced more than once', () => {
      const added = new Signal<unknown, JupyterLab.IPluginInfo[]>({});
      const info = new JupyterLab.Info({ availablePluginsAdded: added });
      const slot = jest.fn();
      info.availablePluginsChanged.connect(slot);

      added.emit([pluginInfo('@jupyterlab/a-extension:plugin', true)]);
      added.emit([pluginInfo('@jupyterlab/b-extension:plugin', false)]);

      expect(slot).toHaveBeenCalledTimes(2);
      expect(info.availablePlugins.map(plugin => plugin.id)).toEqual([
        '@jupyterlab/a-extension:plugin',
        '@jupyterlab/b-extension:plugin'
      ]);
      expect(info.disabled.matches).toEqual(['@jupyterlab/b-extension:plugin']);
    });

    it('should not repeat a disabled plugin id', () => {
      const added = new Signal<unknown, JupyterLab.IPluginInfo[]>({});
      const info = new JupyterLab.Info({
        disabled: { patterns: [], matches: ['@jupyterlab/b-extension:plugin'] },
        availablePluginsAdded: added
      });

      added.emit([pluginInfo('@jupyterlab/b-extension:plugin', false)]);

      expect(info.disabled.matches).toEqual(['@jupyterlab/b-extension:plugin']);
    });

    it('should not emit when no plugin was announced', () => {
      const added = new Signal<unknown, JupyterLab.IPluginInfo[]>({});
      const info = new JupyterLab.Info({ availablePluginsAdded: added });
      const slot = jest.fn();
      info.availablePluginsChanged.connect(slot);

      added.emit([]);

      expect(slot).not.toHaveBeenCalled();
      expect(info.availablePlugins).toEqual([]);
    });

    it('should not add the plugins to the default info', () => {
      const added = new Signal<unknown, JupyterLab.IPluginInfo[]>({});
      const info = new JupyterLab.Info({ availablePluginsAdded: added });

      added.emit([pluginInfo('@jupyterlab/a-extension:plugin', true)]);

      expect(info.availablePlugins).toHaveLength(1);
      expect(JupyterLab.defaultInfo.availablePlugins).toEqual([]);
    });
  });
});
