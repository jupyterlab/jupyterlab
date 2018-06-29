// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import {
  ExtensionView
} from '@jupyterlab/extensionmanager';


/**
 * The extensionmanager-view namespace token.
 */
const namespaceToken = 'extensionmanagerview';

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
 * Initialization data for the extensionmanager extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: '@jupyterlab/javascript-extension:plugin',
  autoStart: true,
  requires: [ILayoutRestorer],
  activate: (app: JupyterLab, restorer: ILayoutRestorer) => {
    const { commands, shell, serviceManager} = app;
    const view = new ExtensionView(serviceManager);
    view.id = 'extensionmanager.main-view';
    restorer.add(view, namespaceToken);
    view.title.label = 'Extensions';
    shell.addToLeftArea(view);


    // If the layout is a fresh session without saved data, open file view.
    app.restored.then(layout => {
      if (layout.fresh) {
        commands.execute(CommandIDs.showExtensionManager, void 0);
      }
    });

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
        return commands.execute(CommandIDs.showExtensionManager, void 0);
      } else {
        return commands.execute(CommandIDs.hideExtensionManager, void 0);
      }
    }
  });

  // TODO: Also add to command palette
}


export default extension;
