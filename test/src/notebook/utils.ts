// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '../../../lib/codemirror';

import {
  CodeCellWidget, BaseCellWidget, CodeCellEditorWidget
} from '../../../lib/notebook/cells';

import {
  NotebookPanel
} from '../../../lib/notebook/notebook/panel';

import {
  Notebook
} from '../../../lib/notebook/notebook/widget';

/**
 * The default notebook content.
 */
export
const DEFAULT_CONTENT: nbformat.INotebookContent = require('../../../examples/notebook/test.ipynb') as nbformat.INotebookContent;


const factory = new CodeMirrorEditorFactory();


/**
 * Create a default code cell renderer.
 */
export
function createCodeCellRenderer(): CodeCellWidget.Renderer {
  return new CodeCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      extra: {
        matchBrackets: true,
        autoCloseBrackets: true
      }
    })
  });
}


/**
 * Create a default base cell renderer.
 */
export
function createBaseCellRenderer(): BaseCellWidget.Renderer {
  return new BaseCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
}


/**
 * Create a default notebook renderer.
 */
export
function createNotebookRenderer(): Notebook.Renderer {
  const codeCellRenderer = createCodeCellRenderer();
  const rawCellRenderer = createBaseCellRenderer();
  const markdownCellRenderer = createBaseCellRenderer();
  const editorMimeTypeService = new CodeMirrorMimeTypeService();
  return new Notebook.Renderer({
    codeCellRenderer, markdownCellRenderer, rawCellRenderer, editorMimeTypeService
  });
}


/**
 * Create a panel renderer.
 */
export
function createPanelRenderer(): NotebookPanel.IRenderer {
  const notebookRenderer = createNotebookRenderer();
  return new NotebookPanel.Renderer({ notebookRenderer });
}


/**
 * Create a code cell editor widget.
 */
export
function createCellEditor(): CodeCellEditorWidget {
  return new CodeCellEditorWidget(
    host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  );
}
