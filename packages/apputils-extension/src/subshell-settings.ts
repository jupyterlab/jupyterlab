/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { CommsOverSubshells } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/*
 * A plugin providing running terminals and sessions settings
 */
export const subshellsSettings: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:sessions-settings',
  description: 'Sessions and terminals settings.',
  autoStart: true,
  requires: [],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    if (settingRegistry) {
      app.started
        .then(async () => {
          const subshellsSettings = await settingRegistry.load(
            '@jupyterlab/apputils-extension:sessions-settings'
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
