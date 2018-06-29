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

import {
  IMainMenu
} from '@jupyterlab/mainmenu';


/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export
  const enable = 'extensionmanager:enable';

  export
  const hide = 'extensionmanager:hide-main';

  export
  const show = 'extensionmanager:activate-main';

  export
  const toggle = 'extensionmanager:toggle-main';
}


/**
 * The extension manager plugin.
 */
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/extensionmanager-extension:plugin',
  autoStart: true,
  requires: [ISettingRegistry, ILayoutRestorer, IRouter],
  activate: async (app: JupyterLab, registry: ISettingRegistry, restorer: ILayoutRestorer, router: IRouter) => {
    const settings = await registry.load(plugin.id);
    const enabled = settings.composite['enabled'] === true;

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

    // If the extension is enabled or disabled, refresh the page.
    app.restored
      .then(() => { settings.changed.connect(() => { router.reload(); }); });
  }
};


/**
 * The menu item for enabling/disabling the extension manager plugin.
 */
const menu: JupyterLabPlugin<void> = {
  id: '@jupyterlab/extensionmanager-extension:menu',
  autoStart: true,
  requires: [ISettingRegistry, IMainMenu],
  activate: async (app: JupyterLab, registry: ISettingRegistry, menu: IMainMenu) => {
    const { commands } = app;
    const key = 'enabled';
    const settings = await registry.load(plugin.id);

    commands.addCommand(CommandIDs.enable, {
      label: 'Enable Extension Manager (requires Node.js/npm)',
      isToggled: () => settings.composite[key] === true,
      execute: () => {
        const enabled = settings.composite[key] === true;

        return registry.set(plugin.id, key, !enabled).catch((reason: Error) => {
          console.error(`Failed to set ${plugin.id}:${key}`, reason.message);
        });
      }
    });
    menu.settingsMenu.addGroup([{ command: CommandIDs.enable }]);
  }
};


/**
 * Add the main file view commands to the application's command registry.
 */
function addCommands(app: JupyterLab, view: ExtensionView): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.show, {
    label: 'Show Extension Manager',
    execute: () => { app.shell.activateById(view.id); }
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
 * Export the plugins as the default.
 */
const plugins: JupyterLabPlugin<any>[] = [plugin, menu];
export default plugins;
