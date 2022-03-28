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
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITableOfContentsRegistry,
  TableOfContents,
  TableOfContentsPanel,
  TableOfContentsRegistry
} from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { tocIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

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
 * @param rendermime - rendered MIME registry
 * @param translator - translator
 * @param editorTracker - editor tracker
 * @param restorer - application layout restorer
 * @param labShell - Jupyter lab shell
 * @param markdownViewerTracker - Markdown viewer tracker
 * @param notebookTracker - notebook tracker
 * @param settingRegistry - setting registry
 * @returns table of contents registry
 */
async function activateTOC(
  app: JupyterFrontEnd,
  rendermime: IRenderMimeRegistry,
  translator?: ITranslator | null,
  restorer?: ILayoutRestorer | null,
  labShell?: ILabShell | null,
  settingRegistry?: ISettingRegistry | null
): Promise<ITableOfContentsRegistry> {
  const trans = (translator ?? nullTranslator).load('jupyterlab');
  // Create the ToC widget:
  const toc = new TableOfContentsPanel(rendermime, translator ?? undefined);

  const tocModels = new WeakMap<Widget, TableOfContents.Model | null>();

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
  // @ts-ignore
  let settings: ISettingRegistry.ISettings | undefined;
  if (settingRegistry) {
    try {
      settings = await settingRegistry.load(extension.id);
    } catch (error) {
      console.error(
        `Failed to load settings for the Table of Contents extension.\n\n${error}`
      );
    }
  }
  /*

  // Create a notebook generator:
  if (notebookTracker) {
    const notebookGenerator = createNotebookGenerator(
      notebookTracker,
      toc,
      rendermime.sanitizer,
      translator,
      settings
    );
    registry.add(notebookGenerator);
  }

  // Create a Markdown generator:
  if (editorTracker) {
    const markdownGenerator = createMarkdownGenerator(
      editorTracker,
      toc,
      rendermime.sanitizer,
      translator,
      settings
    );
    registry.add(markdownGenerator);

    // Create a LaTeX generator:
    const latexGenerator = createLatexGenerator(editorTracker);
    registry.add(latexGenerator);
  }

  // Create a rendered Markdown generator:
  if (markdownViewerTracker) {
    const renderedMarkdownGenerator = createRenderedMarkdownGenerator(
      markdownViewerTracker,
      toc,
      rendermime.sanitizer,
      translator,
      settings
    );
    registry.add(renderedMarkdownGenerator);
  }

  */

  // Update the ToC when the active widget changes:
  if (labShell) {
    labShell.currentChanged.connect(onConnect);
  }

  // Connect to current widget
  onConnect();

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
    let model = tocModels.get(widget);
    if (!model) {
      model = registry.getModel(widget) ?? null;
      tocModels.set(widget, model);
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
  requires: [IRenderMimeRegistry],
  optional: [ITranslator, ILayoutRestorer, ILabShell, ISettingRegistry],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
