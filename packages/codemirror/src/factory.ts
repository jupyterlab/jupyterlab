// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, IEditorFactoryService } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from './editor';

/**
 * CodeMirror editor factory.
 */
export class CodeMirrorEditorFactory implements IEditorFactoryService {
  /**
   * Construct an IEditorFactoryService for CodeMirrorEditors.
   */
  constructor(defaults: Partial<CodeMirrorEditor.IConfig> = {}) {
    this.inlineCodeMirrorConfig = {
      ...CodeMirrorEditor.defaultConfig,
      extraKeys: {
        'Cmd-Right': 'goLineRight',
        End: 'goLineRight',
        'Cmd-Left': 'goLineLeft',
        Tab: 'indentMoreOrinsertTab',
        'Shift-Tab': 'indentLess',
        'Cmd-/': 'toggleComment',
        'Ctrl-/': 'toggleComment'
      },
      ...defaults
    };
    this.documentCodeMirrorConfig = {
      ...CodeMirrorEditor.defaultConfig,
      extraKeys: {
        Tab: 'indentMoreOrinsertTab',
        'Shift-Tab': 'indentLess',
        'Cmd-/': 'toggleComment',
        'Ctrl-/': 'toggleComment',
        'Shift-Enter': () => {
          /* no-op */
        }
      },
      lineNumbers: true,
      scrollPastEnd: true,
      ...defaults
    };
  }

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor = (options: CodeEditor.IOptions) => {
    options.host.dataset.type = 'inline';
    return new CodeMirrorEditor({
      ...options,
      config: { ...this.inlineCodeMirrorConfig, ...(options.config || {}) }
    });
  };

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor = (options: CodeEditor.IOptions) => {
    options.host.dataset.type = 'document';
    return new CodeMirrorEditor({
      ...options,
      config: { ...this.documentCodeMirrorConfig, ...(options.config || {}) }
    });
  };

  protected inlineCodeMirrorConfig: Partial<CodeMirrorEditor.IConfig>;
  protected documentCodeMirrorConfig: Partial<CodeMirrorEditor.IConfig>;
}
