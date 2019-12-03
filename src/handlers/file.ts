// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { FileEditor } from '@jupyterlab/fileeditor';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

export class FileHandler implements IDisposable {
  constructor(options: DebuggerFileHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.fileEditor = options.widget;

    this.editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: this.fileEditor.editor
    });
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.editorHandler.dispose();
    Signal.clearData(this);
  }

  private fileEditor: FileEditor;
  private debuggerService: IDebugger;
  private editorHandler: EditorHandler;
}

export namespace DebuggerFileHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: FileEditor;
  }
}
