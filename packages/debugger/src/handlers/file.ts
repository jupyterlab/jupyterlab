// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor } from '@jupyterlab/fileeditor';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

/**
 * A handler for files.
 */
export class FileHandler implements IDisposable {
  /**
   * Instantiate a new FileHandler.
   *
   * @param options The instantiation options for a FileHandler.
   */
  constructor(options: FileHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._fileEditor = options.widget.content;

    this._hasLineNumber =
      (this._fileEditor.editor.getOption('lineNumbers') as
        | boolean
        | undefined) ?? false;
    this._editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editorReady: () => Promise.resolve(this._fileEditor.editor),
      getEditor: () => this._fileEditor.editor,
      src: this._fileEditor.model.sharedModel
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
    this._editorHandler?.dispose();
    // Restore editor options
    this._editorHandler?.editor!.setOptions({
      lineNumbers: this._hasLineNumber
    });
    Signal.clearData(this);
  }

  private _fileEditor: FileEditor;
  private _debuggerService: IDebugger;
  private _editorHandler: EditorHandler;
  private _hasLineNumber: boolean;
}

/**
 * A namespace for FileHandler `statics`.
 */
export namespace FileHandler {
  /**
   * Instantiation options for `FileHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The widget to handle.
     */
    widget: DocumentWidget<FileEditor>;
  }
}
