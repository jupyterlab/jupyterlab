/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { RunningSessions } from '@jupyterlab/apputils';
import { CommsOverSubshells } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator } from '@jupyterlab/translation';
import { IDisposable } from '@lumino/disposable';
import { KeyboardEvent } from 'react';

/*
 * A plugin providing running terminals and sessions settings
 */
export const sessionsSettings: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:sessions-settings',
  description: 'Sessions and terminals settings.',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator,
    settingRegistry: ISettingRegistry | null
  ) => {
    const createStatusItem = () => {
      const item = new RunningSessions({
        onClick: () => app.shell.activateById('jp-running-sessions'),
        onKeyDown: (event: KeyboardEvent<HTMLImageElement>) => {
          if (
            event.key === 'Enter' ||
            event.key === 'Spacebar' ||
            event.key === ' '
          ) {
            event.preventDefault();
            event.stopPropagation();
            app.shell.activateById('jp-running-sessions');
          }
        },
        serviceManager: app.serviceManager,
        translator
      });

      item.model.sessions = Array.from(
        app.serviceManager.sessions.running()
      ).length;
      item.model.terminals = Array.from(
        app.serviceManager.terminals.running()
      ).length;

      return item;
    };

    const registerItem = () => {
      const item = createStatusItem();
      return statusBar.registerStatusItem(sessionsSettings.id, {
        item,
        align: 'left',
        rank: 0
      });
    };

    if (settingRegistry) {
      let disposable: IDisposable;
      const onSettingsUpdated = (
        settings: ISettingRegistry.ISettings
      ): void => {
        const showStatusBarItem = settings.get('showStatusBarItem')
          .composite as boolean;

        disposable?.dispose();
        if (showStatusBarItem) {
          disposable = registerItem();
        }
      };

      void settingRegistry.load(sessionsSettings.id).then(settings => {
        onSettingsUpdated(settings);
        settings.changed.connect(onSettingsUpdated);
      });
    } else {
      registerItem();
    }

    if (settingRegistry) {
      app.started
        .then(async () => {
          const subshellsSettings = await settingRegistry.load(
            sessionsSettings.id
          );

          const commsOverSubshells = subshellsSettings.get('commsOverSubshells')
            .composite as CommsOverSubshells;

          app.serviceManager.kernels.commsOverSubshells = commsOverSubshells;

          subshellsSettings.changed.connect(() => {
            const commsOverSubshells = subshellsSettings.get(
              'commsOverSubshells'
            ).composite as CommsOverSubshells;
            app.serviceManager.kernels.commsOverSubshells = commsOverSubshells;
          });
        })
        .catch(reason => {
          console.error('Fail to load settings for the subshells.');
          console.error(reason);
        });
    }
  }
};
