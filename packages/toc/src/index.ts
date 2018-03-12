// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {JupyterLab, JupyterLabPlugin} from '@jupyterlab/application';

import {IDocumentManager} from '@jupyterlab/docmanager';

import {INotebookTracker, NotebookPanel} from '@jupyterlab/notebook';

import {each} from '@phosphor/algorithm';

import {IHeading, TableOfContents} from './toc';

import {TableOfContentsRegistry} from './registry';

import '../style/index.css';

/**
 * Initialization data for the jupyterlab-toc extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  requires: [IDocumentManager, INotebookTracker],
  activate: activateTOC,
};

/**
 * Activate the ToC extension.
 */
function activateTOC(
  app: JupyterLab,
  docmanager: IDocumentManager,
  notebookTracker: INotebookTracker,
): void {
  // Create the ToC widget.
  const toc = new TableOfContents(docmanager);

  // Create the ToC registry.
  const registry = new TableOfContentsRegistry();

  // Add the ToC to the left area.
  toc.title.label = 'Contents';
  toc.id = 'table-of-contents';
  app.shell.addToLeftArea(toc);

  // Create a notebook TableOfContentsRegistry.IGenerator
  const notebookGenerator: TableOfContentsRegistry.IGenerator<NotebookPanel> = {
    tracker: notebookTracker,
    generate: panel => {
      let headings: IHeading[] = [];
      each(panel.notebook.widgets, cell => {
        let model = cell.model;
        if (model.type !== 'markdown') {
          return;
        }
        const lines = model.value.text
          .split('\n')
          .filter(line => line[0] === '#');
        lines.forEach(line => {
          const level = line.search(/[^#]/);
          const text = line.slice(level);
          headings.push({text, level, anchor: cell.node});
        });
      });
      return headings;
    },
  };

  registry.addGenerator(notebookGenerator);

  // Change the ToC when the active widget changes.
  app.shell.currentChanged.connect(() => {
    let widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    let generator = registry.findGeneratorForWidget(widget);
    if (!generator) {
      return;
    }
    toc.current = {widget, generator};
  });
}

export default extension;
