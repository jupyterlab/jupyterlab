// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module extensionmanager-extension
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, ICommandPalette, showDialog } from '@jupyterlab/apputils';
import { ExtensionsPanel, ListModel } from '@jupyterlab/extensionmanager';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { extensionIcon } from '@jupyterlab/ui-components';

const PLUGIN_ID = '@jupyterlab/extensionmanager-extension:plugin';

/**
 * IDs of the commands added by this extension.
 */
namespace CommandIDs {
  export const showPanel = 'extensionmanager:show-panel';
  export const toggle = 'extensionmanager:toggle';
}

/**
 * The extension manager plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'Adds the extension manager plugin.',
  autoStart: true,
  requires: [ISettingRegistry],
  optional: [ITranslator, ILayoutRestorer, ICommandPalette],
  activate: async (
    app: JupyterFrontEnd,
    registry: ISettingRegistry,
    translator: ITranslator | null,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null
  ) => {
    const { commands, shell, serviceManager } = app;
    translator = translator ?? nullTranslator;
    const trans = translator.load('jupyterlab');

    const model = new ListModel(serviceManager, translator);

    const createView = () => {
      const v = new ExtensionsPanel({ model, translator: translator! });
      v.id = 'extensionmanager.main-view';
      v.title.icon = extensionIcon;
      v.title.caption = trans.__('Extension Manager');
      v.node.setAttribute('role', 'region');
      v.node.setAttribute('aria-label', trans.__('Extension Manager section'));
      if (restorer) {
        restorer.add(v, v.id);
      }
      shell.add(v, 'left', { rank: 1000 });

      return v;
    };

    // Create a view by default, so it can be restored when loading the workspace.
    let view: ExtensionsPanel | null = createView();

    // If the extension is enabled or disabled,
    // add or remove it from the left area.
    Promise.all([app.restored, registry.load(PLUGIN_ID)])
      .then(([, settings]) => {
        model.isDisclaimed = settings.get('disclaimed').composite as boolean;
        model.isEnabled = settings.get('enabled').composite as boolean;
        model.stateChanged.connect(() => {
          if (
            model.isDisclaimed !==
            (settings.get('disclaimed').composite as boolean)
          ) {
            settings.set('disclaimed', model.isDisclaimed).catch(reason => {
              console.error(`Failed to set setting 'disclaimed'.\n${reason}`);
            });
          }
          if (
            model.isEnabled !== (settings.get('enabled').composite as boolean)
          ) {
            settings.set('enabled', model.isEnabled).catch(reason => {
              console.error(`Failed to set setting 'enabled'.\n${reason}`);
            });
          }
        });

        if (model.isEnabled) {
          view = view ?? createView();
        } else {
          view?.dispose();
          view = null;
        }

        settings.changed.connect(async () => {
          model.isDisclaimed = settings.get('disclaimed').composite as boolean;
          model.isEnabled = settings.get('enabled').composite as boolean;
          app.commands.notifyCommandChanged(CommandIDs.toggle);

          if (model.isEnabled) {
            if (view === null || !view.isAttached) {
              const accepted = await Private.showWarning(trans);
              if (!accepted) {
                void settings.set('enabled', false);
                return;
              }
            }
            view = view ?? createView();
          } else {
            view?.dispose();
            view = null;
          }
        });
      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });

    commands.addCommand(CommandIDs.showPanel, {
      label: trans.__('Extension Manager'),
      execute: () => {
        if (view) {
          shell.activateById(view.id);
        }
      },
      isVisible: () => model.isEnabled
    });

    commands.addCommand(CommandIDs.toggle, {
      label: trans.__('Enable Extension Manager'),
      execute: () => {
        if (registry) {
          void registry.set(plugin.id, 'enabled', !model.isEnabled);
        }
      },
      isToggled: () => model.isEnabled
    });

    if (palette) {
      palette.addItem({
        command: CommandIDs.toggle,
        category: trans.__('Extension Manager')
      });
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
  export async function showWarning(
    trans: TranslationBundle
  ): Promise<boolean> {
    const result = await showDialog({
      title: trans.__('Enable Extension Manager?'),
      body: trans.__(`Thanks for trying out JupyterLab's extension manager.
The JupyterLab development team is excited to have a robust
third-party extension community.
However, we cannot vouch for every extension,
and some may introduce security risks.
Do you want to continue?`),
      buttons: [
        Dialog.cancelButton({ label: trans.__('Disable') }),
        Dialog.warnButton({ label: trans.__('Enable') })
      ]
    });

    return result.button.accept;
  }
}
