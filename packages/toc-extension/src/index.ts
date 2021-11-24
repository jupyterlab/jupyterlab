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

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import {
  createLatexGenerator,
  createMarkdownGenerator,
  createNotebookGenerator,
  createPythonGenerator,
  createRenderedMarkdownGenerator,
  INotebookHeading,
  ITableOfContentsRegistry,
  TableOfContentsRegistry as Registry,
  TableOfContents
} from '@jupyterlab/toc';

import { ITranslator } from '@jupyterlab/translation';

import { tocIcon } from '@jupyterlab/ui-components';

/**
 * A namespace for command IDs of table of contents plugin.
 */
namespace CommandIDs {
  export const runCells = 'toc:run-cells';

  export const showPanel = 'toc:show-panel';
}

/**
 * A plugin to provide a registry for the table of contents.
 */
const registry: JupyterFrontEndPlugin<ITableOfContentsRegistry> = {
  // TODO: rename to `@jupyterlab/toc-extension:registry` for consistency.
  id: '@jupyterlab/toc:plugin',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  requires: [IDocumentManager, IRenderMimeRegistry, ITranslator],
  optional: [
    IEditorTracker,
    ILayoutRestorer,
    ILabShell,
    IMarkdownViewerTracker,
    INotebookTracker,
    ISettingRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    docmanager: IDocumentManager,
    rendermime: IRenderMimeRegistry,
    translator: ITranslator,
    editorTracker?: IEditorTracker,
    restorer?: ILayoutRestorer,
    labShell?: ILabShell,
    markdownViewerTracker?: IMarkdownViewerTracker,
    notebookTracker?: INotebookTracker,
    settingRegistry?: ISettingRegistry
  ): Promise<ITableOfContentsRegistry> => {
    const trans = translator.load('jupyterlab');
    const toc = new TableOfContents({
      docmanager,
      rendermime,
      translator
    });

    // Create the ToC registry:
    const registry = new Registry();

    // Add the ToC to the left area:
    toc.title.icon = tocIcon;
    toc.title.caption = trans.__('Table of Contents');
    toc.id = 'table-of-contents';
    toc.node.setAttribute('role', 'region');
    toc.node.setAttribute('aria-label', trans.__('Table of Contents section'));

    app.shell.add(toc, 'left', { rank: 400 });

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
              cell.headingInfo.level <= level
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
        settings = await settingRegistry.load(
          '@jupyterlab/toc-extension:plugin'
        );
      } catch (error) {
        console.error(
          `Failed to load settings for the Table of Contents extension.\n\n${error}`
        );
      }
    }

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

      // Create a Python generator:
      const pythonGenerator = createPythonGenerator(editorTracker);
      registry.add(pythonGenerator);
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

    const updateCurrent = () => {
      const widget = app.shell.currentWidget;
      if (!widget) {
        return;
      }
      const generator = registry.find(widget);
      if (!generator) {
        // If the previously used widget is still available, stick with it.
        // Otherwise, set the current ToC widget to null.
        if (toc.current && toc.current.widget.isDisposed) {
          toc.current = null;
        }
        return;
      }
      toc.current = { widget, generator };
    };

    // Update the ToC when the active widget changes
    if (labShell) {
      labShell.currentChanged.connect(updateCurrent);
    }

    app.started.then(updateCurrent);

    return registry;
  }
};

/**
 * Export the plugins as default.
 */
export default registry;
