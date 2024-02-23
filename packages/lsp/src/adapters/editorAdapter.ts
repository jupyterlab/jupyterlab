// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IConfigurableExtension,
  IEditorExtensionFactory
} from '@jupyterlab/codemirror';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { WidgetLSPAdapter } from './adapter';
import { Document } from '../tokens';

/**
 * The CodeEditor.IEditor adapter.
 */
export class EditorAdapter implements IDisposable {
  /**
   * Instantiate a new EditorAdapter.
   *
   * @param options The instantiation options for a EditorAdapter.
   */
  constructor(options: EditorAdapter.IOptions) {
    this._widgetAdapter = options.widgetAdapter;
    this._extensions = options.extensions;

    void options.editor.ready().then(editor => {
      this._injectExtensions(options.editor);
    });
  }

  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Setup the editor.
   */
  private _injectExtensions(editor: Document.IEditor): void {
    const codeEditor = editor.getEditor();
    if (!codeEditor || codeEditor.isDisposed) {
      return;
    }

    this._extensions.forEach(factory => {
      const ext = factory.factory({
        path: this._widgetAdapter.widget.context.path,
        editor: editor,
        widgetAdapter: this._widgetAdapter,
        model: codeEditor.model,
        inline: true
      });

      if (!ext) {
        return;
      }

      codeEditor.injectExtension(ext.instance(codeEditor));
    });
  }

  private _widgetAdapter: WidgetLSPAdapter<any>;
  private _extensions: EditorAdapter.ILSPEditorExtensionFactory[];
}

/**
 * A namespace for EditorAdapter `statics`.
 */
export namespace EditorAdapter {
  /**
   * Instantiation options for `EditorAdapter`.
   */
  export interface IOptions {
    /**
     * Editor wrapper enabling revealing the editor when detached (out of view).
     */
    editor: Document.IEditor;

    /**
     * The widget lsp adapter.
     */
    widgetAdapter: WidgetLSPAdapter;

    /**
     * The list of CodeMirror extension factories
     */
    extensions: ILSPEditorExtensionFactory[];
  }

  export interface ILSPEditorExtensionFactory
    extends Omit<IEditorExtensionFactory<any>, 'factory'> {
    /**
     * Extension factory.
     *
     * @param options
     * @returns The extension builder or null if the extension is not active for that document
     */
    readonly factory: (
      options: IFactoryOptions
    ) => IConfigurableExtension<any> | null;
  }

  export interface IFactoryOptions extends IEditorExtensionFactory.IOptions {
    /**
     * A path to a source file.
     */
    path: string;
    /**
     * The code editor.
     */
    editor: Document.IEditor;
    /**
     * The widget lsp adapter.
     */
    widgetAdapter: WidgetLSPAdapter<any>;
  }
}
