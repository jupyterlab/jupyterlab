// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  editorServices
} from '../../../lib/codemirror';

import {
  NotebookPanel, Notebook
} from '../../../lib/notebook';

import {
  BaseCellWidget, CodeCellWidget, CodeCellEditorWidget
} from '../../../lib/notebook/cells';


/**
 * The default notebook content.
 */
export
const DEFAULT_CONTENT: nbformat.INotebookContent = require('../../../examples/notebook/test.ipynb') as nbformat.INotebookContent;


/**
 * Create a base cell renderer.
 */
export
function createBaseCellRenderer(): BaseCellWidget.Renderer {
  return new BaseCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
};


/**
 * Create a new code cell renderer.
 */
export
function createCodeCellRenderer(): CodeCellWidget.Renderer {
  return new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      extra: {
        matchBrackets: true,
        autoCloseBrackets: true
      }
    })
  });
}


/**
 * Create a cell editor widget given a factory.
 */
export
function createCellEditor(): CodeCellEditorWidget {
  return new CodeCellEditorWidget(
    host => editorServices.factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  );
}


/**
 * Create a default notebook renderer.
 */
export
function createNotebookRenderer(): Notebook.Renderer {
  return new Notebook.Renderer({ editorServices });
}


/**
 * Create a default notebook panel renderer.
 */
export
function createNotebookPanelRenderer(): NotebookPanel.Renderer {
  const notebookRenderer = createNotebookRenderer();
  return new NotebookPanel.Renderer({ notebookRenderer });
}
