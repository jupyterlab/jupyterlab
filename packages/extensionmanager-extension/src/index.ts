// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, showDialog, ICommandPalette } from '@jupyterlab/apputils';
import { ExtensionView } from '@jupyterlab/extensionmanager';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { extensionIcon } from '@jupyterlab/ui-components';

const PLUGIN_ID = '@jupyterlab/extensionmanager-extension:plugin';

/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export const toggle = 'extensionmanager:toggle';
}

/**
 * The extension manager plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [ISettingRegistry],
  optional: [ILabShell, ILayoutRestorer, IMainMenu, ICommandPalette],
  activate: async (
    app: JupyterFrontEnd,
    registry: ISettingRegistry,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null,
    mainMenu: IMainMenu | null,
    palette: ICommandPalette | null
  ) => {
    const settings = await registry.load(plugin.id);
    let enabled = settings.composite['enabled'] === true;

    const { commands, serviceManager, shell } = app;
    let view: ExtensionView | undefined;

    const createView = () => {
      const v = new ExtensionView(serviceManager, settings);
      v.id = 'extensionmanager.main-view';
      v.title.icon = extensionIcon;
      v.title.caption = 'Extension Manager';
      if (restorer) {
        restorer.add(v, v.id);
      }
      return v;
    };

    if (enabled) {
      view = createView();
      shell.add(view, 'left', { rank: 1000 });
    }

    // If the extension is enabled or disabled,
    // add or remove it from the left area.
    Promise.all([app.restored, registry.load(PLUGIN_ID)])
      .then(([, settings]) => {
        settings.changed.connect(async () => {
          enabled = settings.composite['enabled'] === true;
          if (enabled && (!view || (view && !view.isAttached))) {
            const accepted = await Private.showWarning();
            if (!accepted) {
              void settings.set('enabled', false);
              return;
            }
            view = view || createView();
            shell.add(view, 'left');
          } else if (!enabled && view && view.isAttached) {
            app.commands.notifyCommandChanged(CommandIDs.toggle);
            view.close();
          }
        });
      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });

    commands.addCommand(CommandIDs.toggle, {
      label: 'Enable Extension Manager',
      execute: () => {
        if (registry) {
          void registry.set(plugin.id, 'enabled', !enabled);
        }
      },
      isToggled: () => enabled,
      isEnabled: () => serviceManager.builder.isAvailable
    });

    const category = 'Extension Manager';
    const command = CommandIDs.toggle;
    if (palette) {
      palette.addItem({ command, category });
    }

    if (mainMenu) {
      mainMenu.settingsMenu.addGroup([{ command }], 100);
    }
  }
};

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
        Dialog.cancelButton({ label: 'Disable' }),
        Dialog.warnButton({ label: 'Enable' })
      ]
    }).then(result => {
      return result.button.accept;
    });
  }
}
