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

export
class MonacoCodeEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, option: CodeEditor.IOptions): CodeEditor.IEditor {
    return new MonacoCodeEditor({
      uuid: uuid(),
      domElement: host,
      editorOptions: {
        wordWrap: true,
        folding: true
      }
    });
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new MonacoCodeEditor({
      uuid: uuid(),
      domElement: host,
      editorOptions: {
        wordWrap: true,
        folding: true
      }
    });
  }

}
