// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module toc-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITableOfContentsRegistry,
  TableOfContents,
  TableOfContentsPanel,
  TableOfContentsRegistry
} from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { tocIcon } from '@jupyterlab/ui-components';

/**
 * A namespace for command IDs of table of contents plugin.
 */
namespace CommandIDs {
  export const runCells = 'toc:run-cells';

  export const showPanel = 'toc:show-panel';
}

/**
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param translator - translator
 * @param restorer - application layout restorer
 * @param labShell - Jupyter lab shell
 * @param settingRegistry - setting registry
 * @returns table of contents registry
 */
async function activateTOC(
  app: JupyterFrontEnd,
  translator?: ITranslator | null,
  restorer?: ILayoutRestorer | null,
  labShell?: ILabShell | null,
  settingRegistry?: ISettingRegistry | null
): Promise<ITableOfContentsRegistry> {
  const trans = (translator ?? nullTranslator).load('jupyterlab');
  let configuration = { ...TableOfContents.defaultConfig };

  // Create the ToC widget:
  const toc = new TableOfContentsPanel(translator ?? undefined);

  const tocModels = new Map<string, TableOfContents.Model | null>();

  // Create the ToC registry:
  const registry = new TableOfContentsRegistry();

  // Add the ToC to the left area:
  toc.title.icon = tocIcon;
  toc.title.caption = trans.__('Table of Contents');
  toc.id = 'table-of-contents';
  toc.node.setAttribute('role', 'region');
  toc.node.setAttribute('aria-label', trans.__('Table of Contents section'));

  app.shell.add(toc, 'left', { rank: 400 });

  /*
  app.commands.addCommand(CommandIDs.runCells, {
    execute: args => {
      if (!notebookTracker) {
        return null;
      }

      const panel = notebookTracker.currentWidget;
      if (panel == null) {
        return;
      }

      const cells = panel.content.widgets;
      if (cells === undefined) {
        return;
      }

      const activeCell = (toc.activeEntry as INotebookHeading).cellRef;

      if (activeCell instanceof MarkdownCell) {
        let level = activeCell.headingInfo.level;
        for (let i = cells.indexOf(activeCell) + 1; i < cells.length; i++) {
          const cell = cells[i];
          if (
            cell instanceof MarkdownCell &&
            cell.headingInfo.level <= level &&
            cell.headingInfo.level > -1
          ) {
            break;
          }

          if (cell instanceof CodeCell) {
            void CodeCell.execute(cell, panel.sessionContext);
          }
        }
      } else {
        if (activeCell instanceof CodeCell) {
          void CodeCell.execute(activeCell, panel.sessionContext);
        }
      }
    },
    label: trans.__('Run Cell(s)')
  });
  */

  app.commands.addCommand(CommandIDs.showPanel, {
    label: trans.__('Table of Contents'),
    execute: () => {
      app.shell.activateById(toc.id);
    }
  });

  if (restorer) {
    // Add the ToC widget to the application restorer:
    restorer.add(toc, '@jupyterlab/toc:plugin');
  }

  // Attempt to load plugin settings:
  let settings: ISettingRegistry.ISettings | undefined;
  if (settingRegistry) {
    try {
      settings = await settingRegistry.load(extension.id);
      const updateSettings = (plugin: ISettingRegistry.ISettings) => {
        const composite = plugin.composite;
        for (const key of [...Object.keys(configuration)]) {
          configuration[key] = composite[key] as any;
        }

        for (const model of tocModels.values()) {
          if (model) {
            model.configuration = configuration;
          }
        }
      };
      if (settings) {
        settings.changed.connect(updateSettings);
        updateSettings(settings);
      }
    } catch (error) {
      console.error(
        `Failed to load settings for the Table of Contents extension.\n\n${error}`
      );
    }
  }

  // Update the ToC when the active widget changes:
  if (labShell) {
    labShell.currentChanged.connect(onConnect);
  }

  // Connect to current widget
  app.restored.then(() => {
    onConnect();
  });

  return registry;

  /**
   * Callback invoked when the active widget changes.
   *
   * @private
   */
  function onConnect() {
    let widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    const id = widget.id;
    let model = tocModels.get(id);
    if (!model || model.isDisposed) {
      model = registry.getModel(widget, configuration) ?? null;
      tocModels.set(id, model);

      widget.disposed.connect(() => {
        tocModels.delete(id);
        model?.dispose();
      });
    }

    toc.model = model;
  }
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension: JupyterFrontEndPlugin<ITableOfContentsRegistry> = {
  id: '@jupyterlab/toc-extension:registry',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  optional: [ITranslator, ILayoutRestorer, ILabShell, ISettingRegistry],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
