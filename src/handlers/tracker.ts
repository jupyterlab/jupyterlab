import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IConsoleTracker } from '@jupyterlab/console';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Callstack } from '../callstack';

import { EditorHandler } from './editor';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

export class WidgetHandler implements IDisposable {
  constructor(options: DebuggerWidgetHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.notebookTracker = options.notebookTracker;
    this.consoleTracker = options.consoleTracker;
    this.editorTracker = options.editorTracker;

    this.debuggerService.modelChanged.connect(() => {
      const debuggerModel = this.debuggerService.model as Debugger.Model;

      debuggerModel.callstackModel.currentFrameChanged.connect(
        this.onCurrentFrameChanged,
        this
      );
    });
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  protected onCurrentFrameChanged(
    callstackModel: Callstack.Model,
    frame: Callstack.IFrame
  ) {
    const debugSessionPath = this.debuggerService.session.client.path;
    this.handleNotebooks(debugSessionPath, frame);
    this.handleConsoles(debugSessionPath, frame);
    this.handleEditors(debugSessionPath, frame);
  }

  protected handleNotebooks(debugSessionPath: string, frame: Callstack.IFrame) {
    if (!this.notebookTracker) {
      return;
    }
    this.notebookTracker.forEach(notebookPanel => {
      const session = notebookPanel.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const cells = notebookPanel.content.widgets;
      // TODO: we might reconsider clearing all cells, for example
      // there could be more than 1 stopped thread, and in different cells
      cells.forEach(cell => EditorHandler.clearHighlight(cell.editor));

      if (!frame) {
        return;
      }

      cells.forEach((cell, i) => {
        // check the event is for the correct cell
        const code = cell.model.value.text;
        const cellId = this.debuggerService.getCodeId(code);
        if (frame.source.path !== cellId) {
          return;
        }
        notebookPanel.content.activeCellIndex = i;
        requestAnimationFrame(() => {
          EditorHandler.showCurrentLine(cell.editor, frame);
        });
      });
    });
  }

  protected handleConsoles(debugSessionPath: string, frame: Callstack.IFrame) {
    if (!this.consoleTracker) {
      return;
    }
    this.consoleTracker.forEach(consoleWidget => {
      const session = consoleWidget.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const code = consoleWidget?.console.promptCell.model.value.text ?? null;
      if (!code) {
        return;
      }

      const codeId = this.debuggerService.getCodeId(code);
      if (frame.source.path !== codeId) {
        return;
      }
      // TODO
    });
  }

  protected handleEditors(debugSessionPath: string, frame: Callstack.IFrame) {
    if (!this.editorTracker) {
      return;
    }
    this.editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (debugSessionPath !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      EditorHandler.clearHighlight(editor);

      if (!frame) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (frame.source.path !== codeId) {
        return;
      }
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(editor, frame);
      });
    });
  }

  private debuggerService: IDebugger;
  private notebookTracker: INotebookTracker | null;
  private consoleTracker: IConsoleTracker | null;
  private editorTracker: IEditorTracker | null;
}

export namespace DebuggerWidgetHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    notebookTracker?: INotebookTracker;
    consoleTracker?: IConsoleTracker;
    editorTracker?: IEditorTracker;
  }
}
