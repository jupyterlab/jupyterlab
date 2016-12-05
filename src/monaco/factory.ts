// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  uuid
} from '@jupyterlab/services/lib/utils';

import {
  IEditorFactory, CodeEditor
} from '../codeeditor';

import {
  MonacoCodeEditor
} from './editor';

/**
 * Monaco editor factory.
 */
export
class MonacoCodeEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {
      uuid: uuid(),
      domElement: host,
      editorOptions: {
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
      }
    }, options);
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return this.newEditor(host, {
      uuid: uuid(),
      domElement: host,
      editorOptions: {
        wordWrap: true,
        folding: true
      }
    }, options);
  }

  /**
   * Creates an editor and applies options.
   */
  protected newEditor(host: HTMLElement, monacoOptions: MonacoCodeEditor.IOptions, options: CodeEditor.IOptions): CodeEditor.IEditor {
    const editor = new MonacoCodeEditor(monacoOptions);
    this.applyOptions(editor, options);
    return editor;
  }

  /**
   * Applies options.
   */
  protected applyOptions(editor: MonacoCodeEditor, options: CodeEditor.IOptions): void {
    if (options.lineNumbers !== undefined) {
      editor.lineNumbers = options.lineNumbers;
    }
    if (options.wordWrap !== undefined) {
      editor.wordWrap = options.wordWrap;
    }
    if (options.readOnly !== undefined) {
      editor.readOnly = options.readOnly;
    }
    const extra = options.extra;
    if (extra) {
      editor.editor.updateOptions(extra);
    }
  }

}
