// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor, IEditorFactoryService
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditor
} from './editor';


/**
 * CodeMirror editor factory.
 */
export
class CodeMirrorEditorFactory implements IEditorFactoryService {
  /**
   * Construct an IEditorFactoryService for CodeMirrorEditors.
   */
  constructor(defaults: Partial<CodeMirrorEditor.IOptions> = {}) {
    this.inlineCodeMirrorOptions = {
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
      ...defaults
    };
    this.documentCodeMirrorOptions = {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      lineNumbers: true,
      lineWrapping: true,
      ...defaults
    };
  }

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new CodeMirrorEditor({...this.inlineCodeMirrorOptions, ...options});
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new CodeMirrorEditor({...this.documentCodeMirrorOptions, ...options});
  }

  protected inlineCodeMirrorOptions: Partial<CodeMirrorEditor.IOptions>;
  protected documentCodeMirrorOptions: Partial<CodeMirrorEditor.IOptions>;

}
