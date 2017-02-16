// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin, CommandIDs
} from './';

import {
  ICommandPalette
} from '../commandpalette';


/**
 * The main extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.main',
  requires: [ICommandPalette],
  activate: (app: JupyterLab, palette: ICommandPalette) => {

    let command = CommandIDs.closeAll;
    app.commands.addCommand(command, {
      label: 'Close All Widgets',
      execute: () => { app.shell.closeAll(); }
    });
    palette.addItem({ command, category: 'Main Area' });

    command = CommandIDs.activateNextTab;
    app.commands.addCommand(command, {
      label: 'Activate Next Tab',
      execute: () => { app.shell.activateNextTab(); }
    });
    palette.addItem({ command, category: 'Main Area' });

    command = CommandIDs.activatePreviousTab;
    app.commands.addCommand(command, {
      label: 'Activate Previous Tab',
      execute: () => { app.shell.activatePreviousTab(); }
    });
    palette.addItem({ command, category: 'Main Area' });

    const message = 'Are you sure you want to exit JupyterLab?\n' +
                    'Any unsaved changes will be lost.';

    // The spec for the `beforeunload` event is implemented differently by
    // the different browser vendors. Consequently, the `event.returnValue`
    // attribute needs to set in addition to a return value being returned.
    // For more information, see:
    // https://developer.mozilla.org/en/docs/Web/Events/beforeunload
    window.addEventListener('beforeunload', event => {
      return (event as any).returnValue = message;
    });
  },
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;
