// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel, Notebook
} from '../notebook';

import {
  BaseCellWidget, CodeCellWidget, CodeCellEditorWidget
} from '../cells';

import {
  IEditorServices, IEditorFactory
} from '../../codeeditor';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '../../codemirror';


/**
 * Create a base cell renderer.
 */
export
function createBaseCellRenderer(factory?: IEditorFactory): BaseCellWidget.Renderer {
  factory = factory || new CodeMirrorEditorFactory();
  return new BaseCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
};


/**
 * Create a new code cell renderer.
 */
export
function createCodeCellRenderer(factory?: IEditorFactory): CodeCellWidget.Renderer {
  factory = factory || new CodeMirrorEditorFactory();
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
 * Create a cell editor widget given a factory.
 */
export
function createCellEditor(factory?: IEditorFactory): CodeCellEditorWidget {
  factory = factory || new CodeMirrorEditorFactory();
  return new CodeCellEditorWidget(
    host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  );
}


/**
 * Create a notebook renderer.
 */
export
function createNotebookRenderer(editorServices?: IEditorServices): Notebook.Renderer {
  editorServices = editorServices || {
    factory: new CodeMirrorEditorFactory(),
    mimeTypeService: new CodeMirrorMimeTypeService()
  };
  let factory = editorServices.factory;
  const editorMimeTypeService = editorServices.mimeTypeService;
  const codeCellRenderer = createCodeCellRenderer(factory);
  const rawCellRenderer = createBaseCellRenderer(factory);
  const markdownCellRenderer = rawCellRenderer;
  return new Notebook.Renderer({
    codeCellRenderer, markdownCellRenderer, rawCellRenderer, editorMimeTypeService
  });
}


/**
 * Create a notebook panel renderer.
 */
export
function createNotebookPanelRenderer(editorServices?: IEditorServices): NotebookPanel.IRenderer {
  const notebookRenderer = createNotebookRenderer(editorServices);
  return new NotebookPanel.Renderer({
    notebookRenderer
  });
}
