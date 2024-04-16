/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IRecentsManager, RecentsManager } from '@jupyterlab/docmanager';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * A namespace for command IDs.
 */
namespace CommandIDs {
  export const clearRecents = 'docmanager:clear-recents';
}

namespace PluginIDs {
  export const recentsManager = '@jupyterlab/docmanager-extension:recents';
  export const reopenClosed =
    '@jupyterlab/docmanager-extension:reopen-recently-closed';
  export const mainPlugin = '@jupyterlab/docmanager-extension:plugin';
}

export const recentsManagerPlugin: JupyterFrontEndPlugin<IRecentsManager> = {
  id: PluginIDs.recentsManager,
  description: 'Provides a manager of recently opened and closed documents.',
  autoStart: true,
  requires: [IStateDB],
  optional: [ISettingRegistry, ITranslator],
  provides: IRecentsManager,
  activate: (
    app: JupyterFrontEnd,
    stateDB: IStateDB,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): IRecentsManager => {
    const { serviceManager } = app;
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    // Create the manager
    const recentsManager = new RecentsManager({
      stateDB: stateDB,
      contents: serviceManager.contents
    });

    const updateSettings = (settings: ISettingRegistry.ISettings) => {
      recentsManager.maximalRecentsLength = settings.get('maxNumberRecents')
        .composite as number;
    };

    if (settingRegistry) {
      void Promise.all([
        app.restored,
        settingRegistry.load(PluginIDs.mainPlugin)
      ]).then(([_, settings]) => {
        settings.changed.connect(updateSettings);
        updateSettings(settings);
      });
    }

    app.commands.addCommand(CommandIDs.clearRecents, {
      execute: () => {
        recentsManager.clearRecents();
      },
      isEnabled: () =>
        recentsManager.recentlyOpened.length != 0 ||
        recentsManager.recentlyClosed.length != 0,
      label: trans.__('Clear Recent Documents'),
      caption: trans.__('Clear the list of recently opened items.')
    });

    return recentsManager;
  }
};
