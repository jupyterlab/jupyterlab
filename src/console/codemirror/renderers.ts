// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeCellWidget
} from '../../notebook/cells/widget';

import {
  CodeMirrorEditor
} from '../../codemirror/editor';

import {
  defaultEditorConfiguration, defaultRawCellRenderer
} from '../../notebook/codemirror/renderers';

import {
  ConsoleContent
} from '../content';

/**
 * A default code mirror renderer for a code cell editor.
 */
export
const defaultConsoleCellRenderer = new CodeCellWidget.Renderer({
  editorFactory: host => {
    const editor = new CodeMirrorEditor(host.node, defaultEditorConfiguration);
    editor.editor.setOption('matchBrackets', false);
    editor.editor.setOption('autoCloseBrackets', false);
    editor.editor.setOption('extraKeys', {
      Enter: function () { /* no-op */ }
    });
    return editor;
  }
});

/**
 * A default code mirror renderer for a console.
 */
export
const defaultConsoleContentRenderer = new ConsoleContent.Renderer({
  bannerRenderer: defaultRawCellRenderer,
  promptRenderer: defaultConsoleCellRenderer,
  foreignCellRenderer: defaultConsoleCellRenderer
});
