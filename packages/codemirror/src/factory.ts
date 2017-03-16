// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

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
  constructor(codeMirrorOptions?: CodeMirror.EditorConfiguration) {
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
      }
    };
    this.documentCodeMirrorOptions = {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      lineNumbers: true,
      lineWrapping: true
    };
    if (codeMirrorOptions !== undefined) {
      // Note: If codeMirrorOptions include `extraKeys`,
      // existing option will be overwritten.
      Private.assign(this.inlineCodeMirrorOptions, codeMirrorOptions);
      Private.assign(this.documentCodeMirrorOptions, codeMirrorOptions);
    }
  }

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new CodeMirrorEditor(options, this.inlineCodeMirrorOptions);
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(options: CodeEditor.IOptions): CodeEditor.IEditor {
    return new CodeMirrorEditor(options, this.documentCodeMirrorOptions);
  }

  protected inlineCodeMirrorOptions: CodeMirror.EditorConfiguration;
  protected documentCodeMirrorOptions: CodeMirror.EditorConfiguration;

}


namespace Private {
  // Replace with Object.assign when available.
  export
  function assign<T>(target: T, ...configs: any[]): T {
    for (const source of configs) {
      if (source) {
        Object.keys(source).forEach(key => {
          (target as any)[key] = (source as any)[key];
        });
      }
    }

    return target;
  }
}
