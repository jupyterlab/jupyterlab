// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeCellWidget
} from '../cells/widget';

import {
  CodeMirrorEditor
} from '../../codemirror/editor';

import {
  Notebook
} from '../notebook/widget';

import {
  NotebookPanel
} from '../notebook/panel';

/**
 * A default code mirror configuration for a cell editor.
 */
export
const defaultEditorConfiguration: CodeMirror.EditorConfiguration = {
  // Default value of the theme is set in the parent constructor,
  // but could be overridden here
  indentUnit: 4,
  readOnly: false,
  extraKeys: {
    'Cmd-Right': 'goLineRight',
    'End': 'goLineRight',
    'Cmd-Left': 'goLineLeft',
    'Tab': 'indentMore',
    'Shift-Tab': 'indentLess',
    'Cmd-Alt-[': 'indentAuto',
    'Ctrl-Alt-[': 'indentAuto',
    'Cmd-/': 'toggleComment',
    'Ctrl-/': 'toggleComment',
  }
};

/**
 * A default code mirror renderer for a code cell editor.
 */
export
const defaultCodeCellRenderer = new CodeCellWidget.Renderer({
  editorFactory: host => {
    const editor = new CodeMirrorEditor(host.node, defaultEditorConfiguration);
    editor.editor.setOption('matchBrackets', true);
    editor.editor.setOption('autoCloseBrackets', true);
    return editor;
  }
});

/**
 * A default code mirror renderer for a markdown cell editor.
 */
export
const defaultMarkdownCellRenderer = new CodeCellWidget.Renderer({
  editorFactory: host => {
    const editor = new CodeMirrorEditor(host.node, defaultEditorConfiguration);
    editor.editor.setOption('lineWrapping', true);
    return editor;
  }
});

/**
 * A default code mirror renderer for a raw cell editor.
 */
export
const defaultRawCellRenderer = new CodeCellWidget.Renderer({
  editorFactory: host => {
    const editor = new CodeMirrorEditor(host.node, defaultEditorConfiguration);
    editor.editor.setOption('lineWrapping', true);
    return editor;
  }
});

/**
 * A default code mirror renderer for a notebook.
 */
export
const defaultNotebookRenderer = new Notebook.Renderer({
  codeCellRenderer: defaultCodeCellRenderer,
  markdownCellRenderer: defaultMarkdownCellRenderer,
  rawCellRenderer: defaultRawCellRenderer
});

/**
 * A default code mirror renderer for a notebook panel.
 */
export
const defaultNotebookPanelRenderer = new NotebookPanel.Renderer({
  notebookRenderer: defaultNotebookRenderer
});
