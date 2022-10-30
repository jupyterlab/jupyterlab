// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { indentLess } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import { CodeEditor, IEditorFactoryService } from '@jupyterlab/codeeditor';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CodeMirrorEditor } from './editor';

/**
 * CodeMirror editor factory.
 */
export class CodeMirrorEditorFactory implements IEditorFactoryService {
  /**
   * Construct an IEditorFactoryService for CodeMirrorEditors.
   */
  constructor(
    defaults: Partial<CodeMirrorEditor.IConfig> = {},
    translator?: ITranslator
  ) {
    this.translator = translator || nullTranslator;
    this.inlineCodeMirrorConfig = {
      ...CodeMirrorEditor.defaultConfig,
      extraKeys: [
        {
          key: 'Tab',
          run: CodeMirrorEditor.indentMoreOrInsertTab,
          shift: indentLess
        },
        ...searchKeymap
      ],
      ...defaults
    };
    this.documentCodeMirrorConfig = {
      ...CodeMirrorEditor.defaultConfig,
      extraKeys: [
        {
          key: 'Tab',
          run: CodeMirrorEditor.indentMoreOrInsertTab,
          shift: indentLess
        },
        {
          key: 'Shift-Enter',
          run: (target: EditorView) => {
            return true;
          }
        }
      ],
      lineNumbers: true,
      scrollPastEnd: true,
      ...defaults
    };
  }

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor = (options: CodeEditor.IOptions): CodeMirrorEditor => {
    options.host.dataset.type = 'inline';
    return new CodeMirrorEditor({
      ...options,
      config: { ...this.inlineCodeMirrorConfig, ...(options.config || {}) },
      translator: this.translator
    });
  };

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor = (options: CodeEditor.IOptions): CodeMirrorEditor => {
    options.host.dataset.type = 'document';
    return new CodeMirrorEditor({
      ...options,
      config: { ...this.documentCodeMirrorConfig, ...(options.config || {}) },
      translator: this.translator
    });
  };

  protected translator: ITranslator;
  protected inlineCodeMirrorConfig: Partial<CodeMirrorEditor.IConfig>;
  protected documentCodeMirrorConfig: Partial<CodeMirrorEditor.IConfig>;
}
