// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  editorServices
} from '../../../lib/codemirror';

import {
  CodeEditorWidget
} from '../../../lib/codeeditor';

import {
  NotebookPanel, Notebook
} from '../../../lib/notebook';

import {
  BaseCellWidget, CodeCellWidget, CodeCellModel
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
    editorFactory: options => {
      options.wordWrap = true;
      return editorServices.factoryService.newInlineEditor(options);
    }
  });
};


/**
 * Create a new code cell renderer.
 */
export
function createCodeCellRenderer(): CodeCellWidget.Renderer {
  return new CodeCellWidget.Renderer({
    editorFactory: options => {
      return editorServices.factoryService.newInlineEditor(options);
    }
  });
}


/**
 * Create a cell editor widget given a factory.
 */
export
function createCellEditor(): CodeEditorWidget {
  return new CodeEditorWidget({
    model: new CodeCellModel(),
    factory: options => {
      options.wordWrap = true;
      return editorServices.factoryService.newInlineEditor(options);
    }
  });
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
