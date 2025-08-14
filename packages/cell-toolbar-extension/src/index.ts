/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module cell-toolbar-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CellBarExtension } from '@jupyterlab/cell-toolbar';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

const PLUGIN_ID = '@jupyterlab/cell-toolbar-extension:plugin';

const cellToolbar: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'Add the cells toolbar.',
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    toolbarRegistry: IToolbarWidgetRegistry | null,
    translator: ITranslator | null
  ) => {
    /**
     * Load the settings for this extension
     *
     * @param setting Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings | null): void {
      // Read the setting and convert to the correct type
      const showCellToolbar: boolean | null =
        setting === null
          ? true
          : (setting.get('showToolbar').composite as boolean);

      extension.enabled = showCellToolbar;
    }

    const toolbarItems =
      settingRegistry && toolbarRegistry
        ? createToolbarFactory(
            toolbarRegistry,
            settingRegistry,
            CellBarExtension.FACTORY_NAME,
            cellToolbar.id,
            translator ?? nullTranslator
          )
        : undefined;

    const extension = new CellBarExtension(app.commands, toolbarItems);

    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    if (settingRegistry !== null) {
      void Promise.all([app.restored, settingRegistry.load(PLUGIN_ID)]).then(
        ([, setting]) => {
          // Read the settings
          loadSetting(setting);

          // Listen for your plugin setting changes using Signal
          setting.changed.connect(loadSetting);
        }
      );
    }

    app.docRegistry.addWidgetExtension('Notebook', extension);
  },
  optional: [ISettingRegistry, IToolbarWidgetRegistry, ITranslator]
};

export default cellToolbar;
