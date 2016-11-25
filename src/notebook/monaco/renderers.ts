// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  MonacoCodeEditor
} from '../../monaco/editor';

import {
  CodeCellWidget
} from '../cells/widget';

import {
  Notebook
} from '../notebook/widget';

import {
  NotebookPanel
} from '../notebook/panel';

/**
 * A default Monaco configuration for a cell editor.
 */
export
const defaultEditorConfiguration: MonacoCodeEditor.IEditorConstructionOptions = {
  autoSizing: true,
  lineNumbers: 'off',
  lineNumbersMinChars: 4,
  lineDecorationsWidth: 5,
  scrollbar: {
    horizontal: 'hidden',
    vertical: 'hidden',
    horizontalScrollbarSize: 0,
    handleMouseWheel: false
  },
  contextmenu: false,
  scrollBeyondLastLine: false
};

/**
 * A default Monaco renderer for a cell widget.
 */
export
const defaultCellRenderer = new CodeCellWidget.Renderer({
  editorFactory: host => new MonacoCodeEditor({
    uuid: utils.uuid(),
    domElement: host.node,
    editorOptions: defaultEditorConfiguration
  })
});

/**
 * A default monaco mirror renderer for a notebook.
 */
export
const defaultNotebookRenderer = new Notebook.Renderer({
  codeCellRenderer: defaultCellRenderer,
  markdownCellRenderer: defaultCellRenderer,
  rawCellRenderer: defaultCellRenderer
});

/**
 * A default code mirror renderer for a notebook panel.
 */
export
const defaultNotebookPanelRenderer = new NotebookPanel.Renderer({
  notebookRenderer: defaultNotebookRenderer
});

