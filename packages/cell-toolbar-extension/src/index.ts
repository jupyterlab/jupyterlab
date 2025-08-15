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
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { runIcon, ToolbarButton } from '@jupyterlab/ui-components';

const PLUGIN_ID = {
  cellToolbar: '@jupyterlab/cell-toolbar-extension:plugin',
  runButton: '@jupyterlab/cell-toolbar-extension:run-button'
};

const cellToolbar: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID.cellToolbar,
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
      void Promise.all([
        app.restored,
        settingRegistry.load(PLUGIN_ID.cellToolbar)
      ]).then(([, setting]) => {
        // Read the settings
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);
      });
    }

    app.docRegistry.addWidgetExtension('Notebook', extension);
  },
  optional: [ISettingRegistry, IToolbarWidgetRegistry, ITranslator]
};

const runCellButton: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID.runButton,
  description: 'Add the cells toolbar.',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    translator: ITranslator
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    const runButtonFactory = (panel: NotebookPanel) =>
      new ToolbarButton({
        icon: runIcon,
        onClick: () => {
          void NotebookActions.runAndAdvance(
            panel.content,
            panel.sessionContext
          );
        },
        tooltip: trans.__('Run the selected cells and advance')
      });

    tracker.widgetAdded.connect((_, panel) => {
      const cellListChanged = () => {
        panel.content.widgets.forEach(cell => {
          cell.ready
            .then(() => {
              if (cell.inputArea) {
                cell.inputArea.prompt.runButton = runButtonFactory(panel);
              }
            })
            .catch(() => {
              // no-op
            });
        });
      };
      panel.content.model?.cells.changed.connect(cellListChanged);

      panel.disposed.connect(() => {
        panel.content.model?.cells.changed.disconnect(cellListChanged);
      });
    });
  }
};

export default [cellToolbar, runCellButton];
