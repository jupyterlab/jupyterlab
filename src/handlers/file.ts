// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { FileEditor } from '@jupyterlab/fileeditor';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from '../handlers/editor';

import { Callstack } from '../callstack';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

export class FileHandler implements IDisposable {
  constructor(options: DebuggerFileHandler.IOptions) {
    this.debuggerModel = options.debuggerService.model as Debugger.Model;
    this.debuggerService = options.debuggerService;
    this.fileEditor = options.widget;

    this.editorHandler = new EditorHandler({
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      editor: this.fileEditor.editor
    });

    this.debuggerModel.callstackModel.currentFrameChanged.connect(
      this.onCurrentFrameChanged,
      this
    );
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

  private onCurrentFrameChanged(
    callstackModel: Callstack.Model,
    frame: Callstack.IFrame
  ) {
    const editor = this.fileEditor.editor;
    EditorHandler.clearHighlight(editor);

    if (!frame) {
      return;
    }

    const code = editor.model.value.text;
    const cellId = this.debuggerService.getCellId(code);
    if (frame.source.path !== cellId) {
      return;
    }
    // request drawing the line after the editor has been cleared above
    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(editor, frame);
    });
  }
  private fileEditor: FileEditor;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private editorHandler: EditorHandler;
}

export namespace DebuggerFileHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: FileEditor;
  }
}
