// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterLab,
  LayoutRestorer
} from '@jupyterlab/application';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { DockPanel } from '@lumino/widgets';

describe('plugins', () => {
  let lab: JupyterLab;
  let plugin: JupyterFrontEndPlugin<void> = {
    id: '@jupyterlab/test-extension:plugin',
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
