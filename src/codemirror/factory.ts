// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  CodeMirrorEditor, DEFAULT_CODEMIRROR_THEME
} from './editor';

/**
 * CodeMirror editor factory.
 */
export
class CodeMirrorEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {
      uuid: utils.uuid(),
      indentUnit: 4,
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
    }, options);
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {
      uuid: utils.uuid(),
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true
    }, options);
  }

  /**
   * Creates an editor and applies extra options.
   */
  protected newEditor(host: HTMLElement, editorOptions: CodeMirrorEditor.IOptions, options: CodeEditor.IOptions) {
    editorOptions.readOnly = (options.readOnly !== undefined) ? options.readOnly : false;
    editorOptions.lineNumbers = (options.lineNumbers !== undefined) ? options.lineNumbers : true;
    editorOptions.lineWrapping = (options.wordWrap !== undefined) ? options.wordWrap : true;
    const editor = new CodeMirrorEditor(host, editorOptions);
    const extra = options.extra;
    if (extra) {
      for (const option in extra) {
        editor.editor.setOption(option, extra[option]);
      }
    }
    return editor;
  }

}
