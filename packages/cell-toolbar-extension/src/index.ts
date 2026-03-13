/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module cell-toolbar-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CellBarExtension } from '@jupyterlab/cell-toolbar';
import {
  createToolbarFactory,
  Dialog,
  IToolbarWidgetRegistry,
  showDialog
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
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    app.commands.addCommand('cell-toolbar:delete', {
      label: trans.__('Delete Cell'),
      caption: trans.__('Delete the cell'),
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: async args => {
        let shouldConfirmDelete = true;
        let setting: ISettingRegistry.ISettings | undefined;

        if (settingRegistry) {
          setting = await settingRegistry.load(PLUGIN_ID);
          shouldConfirmDelete = setting.get('askCellDeleteConfirmation')
            .composite as boolean;
        }

        if (!shouldConfirmDelete) {
          return app.commands.execute('notebook:delete-cell', args);
        }

        const result = await showDialog({
          title: trans.__('Delete Cell'),
          body: trans.__('Are you sure you want to delete this cell?'),
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: trans.__('Delete') })
          ],
          checkbox: settingRegistry
            ? {
                label: trans.__('Do not ask me again'),
                caption: trans.__('Ignore this warning for future deletions.')
              }
            : null
        });

        if (result.button.accept) {
          if (result.isChecked && setting) {
            await setting.set('askCellDeleteConfirmation', false);
          }
          return app.commands.execute('notebook:delete-cell', args);
        }
      }
    });

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
