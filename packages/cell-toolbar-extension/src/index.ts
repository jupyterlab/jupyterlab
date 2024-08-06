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
  CommandToolbarButton,
  createToolbarFactory,
  IToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

const cellToolbar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/cell-toolbar-extension:plugin',
  description: 'Add the cells toolbar.',
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    toolbarRegistry: IToolbarWidgetRegistry | null,
    translator: ITranslator | null
  ) => {
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

    const helperButtons = [];

    // Only display a run button if the settings say to do so. Default to use.
    let showRunButton = true;
    if (settingRegistry !== null) {
      const settings = settingRegistry!.load(cellToolbar.id);
      showRunButton = (await settings).get('cellRunButton')
        .composite as boolean;
    }

    if (showRunButton) {
      helperButtons.push(
        new CommandToolbarButton({
          commands: app.commands,
          id: 'notebook:run-cell-and-select-next',
          args: { toolbar: true },
          // Do not display a text label beside the button
          label: ''
        })
      );
    }

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new CellBarExtension(app.commands, toolbarItems, helperButtons)
    );
  },
  optional: [ISettingRegistry, IToolbarWidgetRegistry, ITranslator]
};

export default cellToolbar;
