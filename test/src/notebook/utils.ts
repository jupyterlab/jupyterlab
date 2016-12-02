// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '../../../lib/codemirror';

import {
  CodeCellWidget
} from '../../../lib/notebook/cells/widget';

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


/**
 * Create a default notebook renderer.
 */
export
function createRenderer(): Notebook.Renderer {
  const factory = new CodeMirrorEditorFactory();
  const codeCellRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      extra: {
        matchBrackets: true,
        autoCloseBrackets: true
      }
    })
  });
  const rawCellRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
  const markdownCellRenderer = rawCellRenderer;
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
  const notebookRenderer = createRenderer();
  return new NotebookPanel.Renderer({ notebookRenderer });
}
