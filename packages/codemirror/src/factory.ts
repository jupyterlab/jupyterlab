// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, IEditorFactoryService } from '@jupyterlab/codeeditor';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { EditorView, keymap } from '@codemirror/view';
import { EditorExtensionRegistry } from './extension';
import { CodeMirrorEditor } from './editor';
import { EditorLanguageRegistry } from './language';
import {
  IEditorExtensionFactory,
  IEditorExtensionRegistry,
  IEditorFactoryOptions,
  IEditorLanguageRegistry
} from './token';

/**
 * CodeMirror editor factory.
 */
export class CodeMirrorEditorFactory implements IEditorFactoryService {
  /**
   * Construct an IEditorFactoryService for CodeMirrorEditors.
   */
  constructor(options: IEditorFactoryOptions = {}) {
    this.languages = options.languages ?? new EditorLanguageRegistry();
    this.extensions = options.extensions ?? new EditorExtensionRegistry();
    this.translator = options.translator ?? nullTranslator;
    this.inlineCodeMirrorConfig = {
      searchWithCM: true
    };
    this.documentCodeMirrorConfig = {
      lineNumbers: true,
      scrollPastEnd: true
    };
  }

  /**
   * Create a new editor for inline code.
   */
  readonly newInlineEditor = (
    options: CodeEditor.IOptions
  ): CodeMirrorEditor => {
    options.host.dataset.type = 'inline';
    return this.newEditor({
      ...options,
      config: { ...this.inlineCodeMirrorConfig, ...(options.config || {}) },
      inline: true
    });
  };

  /**
   * Create a new editor for a full document.
   */
  readonly newDocumentEditor = (
    options: CodeEditor.IOptions
  ): CodeMirrorEditor => {
    options.host.dataset.type = 'document';
    return this.newEditor({
      ...options,
      config: { ...this.documentCodeMirrorConfig, ...(options.config ?? {}) },
      inline: false,
      extensions: [
        keymap.of([
          {
            key: 'Shift-Enter',
            run: (target: EditorView) => {
              return true;
            }
          }
        ])
      ].concat(options.extensions ?? [])
    });
  };

  /**
   * Create a new editor
   *
   * @param options Editor options
   * @returns The editor
   */
  protected newEditor(
    options: CodeEditor.IOptions & IEditorExtensionFactory.IOptions
  ): CodeMirrorEditor {
    const editor = new CodeMirrorEditor({
      extensionsRegistry: this.extensions,
      languages: this.languages,
      translator: this.translator,
      ...options
    });

    return editor;
  }

  protected extensions: IEditorExtensionRegistry;
  protected languages: IEditorLanguageRegistry;
  protected translator: ITranslator;
  protected inlineCodeMirrorConfig: Record<string, any>;
  protected documentCodeMirrorConfig: Record<string, any>;
}
