// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  IRouter,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { ExtensionView } from '@jupyterlab/extensionmanager';

/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export const enable = 'extensionmanager:enable';

  export const hide = 'extensionmanager:hide-main';

  export const show = 'extensionmanager:activate-main';

  export const toggle = 'extensionmanager:toggle-main';
}

/**
 * The extension manager plugin.
 */
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/extensionmanager-extension:plugin',
  autoStart: true,
  requires: [ISettingRegistry, ILayoutRestorer, IRouter],
  activate: async (
    app: JupyterLab,
    registry: ISettingRegistry,
    restorer: ILayoutRestorer,
    router: IRouter
  ) => {
    const settings = await registry.load(plugin.id);
    const enabled = settings.composite['enabled'] === true;

    // If the extension is enabled or disabled, refresh the page.
    app.restored.then(() => {
      settings.changed.connect(() => {
        router.reload();
      });
    });

    if (!enabled) {
      return;
    }

    const { shell, serviceManager } = app;
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

  commands.addCommand(CommandIDs.show, {
    label: 'Show Extension Manager',
    execute: () => {
      app.shell.activateById(view.id);
    }
  });

  commands.addCommand(CommandIDs.hide, {
    execute: () => {
      if (!view.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.toggle, {
    execute: () => {
      if (view.isHidden) {
        return commands.execute(CommandIDs.show, undefined);
      } else {
        return commands.execute(CommandIDs.hide, undefined);
      }
    }
  });

  // TODO: Also add to command palette
}

/**
 * Export the plugin as the default.
 */
export default plugin;
