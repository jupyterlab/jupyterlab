// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  CodeMirrorEditor, DEFAULT_CODEMIRROR_THEME
} from './editor';

export
class CodeMirrorEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, option: CodeEditor.IOptions): CodeEditor.IEditor {
    // FIXME: merge given options
    return new CodeMirrorEditor(host, {
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
      },
      lineNumbers: true,
      lineWrapping: true,
    });
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new CodeMirrorEditor(host, {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true,
    });
  }

}
