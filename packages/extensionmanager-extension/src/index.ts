// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, IRouter, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  ExtensionView
} from '@jupyterlab/extensionmanager';


/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export
  const hideExtensionManager = 'extensionmanager:hide-main';

  export
  const showExtensionManager = 'extensionmanager:activate-main';

  export
  const toggleExtensionManager = 'extensionmanager:toggle-main';
}


/**
 * Initialization data for the extensionmanager plugin.
 */
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/extensionmanager-extension:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, ISettingRegistry, IRouter],
  activate: async (app: JupyterLab, restorer: ILayoutRestorer, registry: ISettingRegistry, router: IRouter) => {
    const settings = await registry.load(plugin.id);
    const enabled = settings.composite['enabled'] as boolean;

    // If the extension is enabled or disabled, refresh the page.
    settings.changed.connect(() => { router.reload(); });

    if (!enabled) {
      return;
    }

    const { shell, serviceManager} = app;
    const view = new ExtensionView(serviceManager);

    view.id = 'extensionmanager.main-view';
    view.title.label = 'Extensions';
    restorer.add(view, view.id);
    shell.addToLeftArea(view);
    addCommands(app, view);
  }
};


/**
 * Add the main file view commands to the application's command registry.
 */
function addCommands(app: JupyterLab, view: ExtensionView): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.showExtensionManager, {
    label: 'Show Extension Manager',
    execute: () => { app.shell.activateById(view.id); }
  });

  commands.addCommand(CommandIDs.hideExtensionManager, {
    execute: () => {
      if (!view.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.toggleExtensionManager, {
    execute: () => {
      if (view.isHidden) {
        return commands.execute(CommandIDs.showExtensionManager, undefined);
      } else {
        return commands.execute(CommandIDs.hideExtensionManager, undefined);
      }
    }
  });

  // TODO: Also add to command palette
}


export default plugin;
