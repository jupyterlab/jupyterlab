// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  IRouter,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { Dialog, showDialog } from '@jupyterlab/apputils';

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
    let enabled = settings.composite['enabled'] === true;

    const { shell, serviceManager } = app;
    let view: ExtensionView | undefined;

    const createView = () => {
      const v = new ExtensionView(serviceManager);
      v.id = 'extensionmanager.main-view';
      v.title.label = 'Extensions';
      restorer.add(v, v.id);
      return v;
    };

    if (enabled) {
      view = createView();
      shell.addToLeftArea(view);
    }

    // If the extension is enabled or disabled,
    // add or remove it from the left area.
    app.restored.then(() => {
      settings.changed.connect(async () => {
        enabled = settings.composite['enabled'] === true;
        if (enabled && (!view || (view && !view.isAttached))) {
          const accepted = await Private.showWarning();
          if (!accepted) {
            settings.set('enabled', false);
            return;
          }
          view = view || createView();
          shell.addToLeftArea(view);
        } else if (!enabled && view && view.isAttached) {
          view.close();
        }
      });
    });

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

/**
 * A namespace for module-private functions.
 */
namespace Private {
  /**
   * Show a warning dialog about extension security.
   *
   * @returns whether the user accepted the dialog.
   */
  export async function showWarning(): Promise<boolean> {
    return showDialog({
      title: 'Enable Extension Manager?',
      body:
        "Thanks for trying out JupyterLab's extension manager. " +
        'The JupyterLab development team is excited to have a robust ' +
        'third-party extension community. ' +
        'However, we cannot vouch for every extension, ' +
        'and some may introduce security risks. ' +
        'Do you want to continue?',
      buttons: [
        Dialog.cancelButton({ label: 'DISABLE' }),
        Dialog.warnButton({ label: 'ENABLE' })
      ]
    }).then(result => {
      if (result.button.accept) {
        return true;
      } else {
        return false;
      }
    });
  }
}
