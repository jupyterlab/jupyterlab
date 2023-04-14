// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module statusbar-extension
 */

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar, StatusBar } from '@jupyterlab/statusbar';
import { ITranslator } from '@jupyterlab/translation';

const STATUSBAR_PLUGIN_ID = '@jupyterlab/statusbar-extension:plugin';

/**
 * Initialization data for the statusbar extension.
 */
const statusBar: JupyterFrontEndPlugin<IStatusBar> = {
  id: STATUSBAR_PLUGIN_ID,
  description: 'Provides the application status bar.',
  requires: [ITranslator],
  provides: IStatusBar,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    labShell: ILabShell | null,
    settingRegistry: ISettingRegistry | null,
    palette: ICommandPalette | null
  ) => {
    const trans = translator.load('jupyterlab');
    const statusBar = new StatusBar();
    statusBar.id = 'jp-main-statusbar';
    app.shell.add(statusBar, 'bottom');

    // If available, connect to the shell's layout modified signal.
    if (labShell) {
      labShell.layoutModified.connect(() => {
        statusBar.update();
      });
    }

    const category: string = trans.__('Main Area');
    const command: string = 'statusbar:toggle';

    app.commands.addCommand(command, {
      label: trans.__('Show Status Bar'),
      execute: () => {
        statusBar.setHidden(statusBar.isVisible);
        if (settingRegistry) {
          void settingRegistry.set(
            STATUSBAR_PLUGIN_ID,
            'visible',
            statusBar.isVisible
          );
        }
      },
      isToggled: () => statusBar.isVisible
    });

    app.commands.commandExecuted.connect((registry, executed) => {
      if (executed.id === 'application:reset-layout' && !statusBar.isVisible) {
        app.commands.execute(command).catch(reason => {
          console.error('Failed to show the status bar.', reason);
        });
      }
    });

    if (palette) {
      palette.addItem({ command, category });
    }

    if (settingRegistry) {
      const loadSettings = settingRegistry.load(STATUSBAR_PLUGIN_ID);
      const updateSettings = (settings: ISettingRegistry.ISettings): void => {
        const visible = settings.get('visible').composite as boolean;
        statusBar.setHidden(!visible);
      };

      Promise.all([loadSettings, app.restored])
        .then(([settings]) => {
          updateSettings(settings);
          settings.changed.connect(settings => {
            updateSettings(settings);
          });
        })
        .catch((reason: Error) => {
          console.error(reason.message);
        });
    }

    return statusBar;
  },
  optional: [ILabShell, ISettingRegistry, ICommandPalette]
};

export default statusBar;
