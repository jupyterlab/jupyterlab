// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, showDialog
} from '@jupyterlab/apputils';

import {
  ISettingRegistry, PageConfig, PathExt
} from '@jupyterlab/coreutils';

import {
  IDocumentManager
} from '@jupyterlab/docmanager';

import {
  Contents
} from '@jupyterlab/services';


/**
 * The command IDs used by the application plugin.
 */
namespace CommandIDs {
  export
  const activateNextTab: string = 'main-jupyterlab:activate-next-tab';

  export
  const activatePreviousTab: string = 'main-jupyterlab:activate-previous-tab';

  export
  const closeAll: string = 'main-jupyterlab:close-all';

  export
  const setMode: string = 'main-jupyterlab:set-mode';

  export
  const toggleMode: string = 'main-jupyterlab:toggle-mode';
};


/**
 * The main extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.main',
  requires: [ICommandPalette, IDocumentManager],
  activate: (app: JupyterLab, palette: ICommandPalette, manager: IDocumentManager) => {
    Private.setDB(app, manager);
    app.settings.load(plugin.id).then(settings => {
      console.log(settings.id, settings);
    }).catch(reason => {
      console.warn('settings load failure', reason);
    });

    // Add the main application commands.
    const category = 'Main Area';
    let command = CommandIDs.activateNextTab;
    app.commands.addCommand(command, {
      label: 'Activate Next Tab',
      execute: () => { app.shell.activateNextTab(); }
    });
    palette.addItem({ command, category });

    command = CommandIDs.activatePreviousTab;
    app.commands.addCommand(command, {
      label: 'Activate Previous Tab',
      execute: () => { app.shell.activatePreviousTab(); }
    });
    palette.addItem({ command, category });

    command = CommandIDs.closeAll;
    app.commands.addCommand(command, {
      label: 'Close All Widgets',
      execute: () => { app.shell.closeAll(); }
    });
    palette.addItem({ command, category });

    command = CommandIDs.setMode;
    app.commands.addCommand(command, {
      isVisible: args => {
        const mode = args['mode'] as string;
        return mode === 'single-document' || mode === 'multiple-document';
      },
      execute: args => {
        const mode = args['mode'] as string;
        if (mode === 'single-document' || mode === 'multiple-document') {
          app.shell.mode = mode;
          return;
        }
        throw new Error(`Unsupported application shell mode: ${mode}`);
      }
    });

    command = CommandIDs.toggleMode;
    app.commands.addCommand(command, {
      label: 'Toggle Single-Document Mode',
      execute: () => {
        const args = app.shell.mode === 'multiple-document' ?
          { mode: 'single-document' } : { mode: 'multiple-document' };
        return app.commands.execute(CommandIDs.setMode, args);
      }
    });
    palette.addItem({ command, category });

    // Temporary build message for manual rebuild.
    let buildMessage = PageConfig.getOption('buildRequired');
    if (buildMessage) {
      let body = document.createElement('div');
      body.innerHTML = (
        '<p>JupyterLab build is out of date.<br>' +
        'Please run <code>jupyter lab build</code> from<br>' +
        'the command line and relaunch.</p>'
      );
      showDialog({
        title: 'Build Recommended',
        body,
        buttons: [Dialog.okButton()]
      });
    }

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


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Set the datastore for the application setting registry.
   */
  export
  function setDB(app: JupyterLab, manager: IDocumentManager): void {
    const ready = manager.services.ready;
    const root = '/';
    const folder = '.settings';
    const extension = PathExt.normalizeExtension('json');
    app.settings.setDB({
      fetch: (id: string): Promise<ISettingRegistry.IPlugin> => {
        const name = `${id}${extension}`;
        const system = PathExt.resolve(root, folder, 'system', name);
        const user = PathExt.resolve(root, folder, 'user', name);
        return ready.then(() => {
          const contents = manager.services.contents;
          return Promise.all([
            contents.get(system).catch(() => null),
            contents.get(user).catch(() => null)
          ]).then((files: Contents.IModel[]) => {
            const result: ISettingRegistry.IPlugin = { id, data: {} };
            ['system', 'user'].forEach((level: ISettingRegistry.Level, index) => {
              if (files[index]) {
                try {
                  result.data[level] = JSON.parse(files[index].content);
                } catch (error) {
                  console.warn(`Error fetching ${id} ${level} settings`, error);
                  result.data[level] = null;
                }
              }
            });
            return result;
          });
        });
      },
      remove: (file: string): Promise<void> => {
        return Promise.reject(new Error('remove not implemented'));
      },
      save: (file: string, value: ISettingRegistry.IPlugin): Promise<void> => {
        return Promise.reject(new Error('save not implemented'));
      }
    });
  }
}
