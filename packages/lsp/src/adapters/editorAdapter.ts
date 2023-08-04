// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import {
  IConfigurableExtension,
  IEditorExtensionFactory
} from '@jupyterlab/codemirror';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';
import { WidgetLSPAdapter } from './adapter';

/**
 * A handler for a CodeEditor.IEditor.
 */
export class EditorAdapter implements IDisposable {
  /**
   * Instantiate a new EditorAdapter.
   *
   * @param options The instantiation options for a EditorAdapter.
   */
  constructor(options: EditorAdapter.IOptions) {
    this._path = options.path;
    this._editor = options.getEditor;
    this._adapter = options.adapter;
    this._extensions = options.extensions;

    void options.editorReady().then(() => {
      this._injectExtensions();
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
  private _injectExtensions(): void {
    const editor = this._editor();
    if (!editor || editor.isDisposed) {
      return;
    }

    this._extensions.forEach(factory => {
      const ext = factory.factory({
        path: this._path,
        editor: editor,
        adapter: this._adapter,
        model: editor.model,
        inline: true
      });

      if (!ext) {
        return;
      }

      editor.injectExtension(ext.instance(editor));
    });
  }

  private _path: string;
  private _editor: () => CodeEditor.IEditor | null;
  private _adapter: WidgetLSPAdapter<any>;
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
     * Promise resolving when the editor is ready.
     */
    editorReady(): Promise<CodeEditor.IEditor>;

    /**
     * Get the code editor to handle.
     */
    getEditor(): CodeEditor.IEditor | null;

    /**
     * A path to a source file.
     */
    path: string;

    /**
     * The widget lsp adapter.
     */
    adapter: WidgetLSPAdapter<any>;

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
    editor: CodeEditor.IEditor;
    /**
     * The widget lsp adapter.
     */
    adapter: WidgetLSPAdapter<any>;
  }
}
