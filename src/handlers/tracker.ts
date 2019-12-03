import { CodeEditor } from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { chain, each } from '@phosphor/algorithm';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Callstack } from '../callstack';

import { EditorHandler } from './editor';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

/**
 * A class which handles notebook, console and editor trackers.
 */
export class TrackerHandler implements IDisposable {
  /**
   * Constructs a new TrackerHandler.
   */
  constructor(options: DebuggerTrackerHandler.IOptions) {
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

      debuggerModel.breakpointsModel.clicked.connect((_, breakpoint) => {
        const debugSessionPath = this.debuggerService.session.client.path;
        this.find(debugSessionPath, breakpoint.source.path);
      });
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
    const source = frame?.source.path ?? null;
    each(this.find(debugSessionPath, source), editor => {
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(editor, frame.line);
      });
    });
  }

  protected find(debugSessionPath: string, source: string) {
    return chain(
      this.findInNotebooks(debugSessionPath, source),
      this.findInConsoles(debugSessionPath, source),
      this.findInEditors(debugSessionPath, source)
    );
  }

  protected findInNotebooks(debugSessionPath: string, source: string) {
    if (!this.notebookTracker) {
      return [];
    }
    let editors: CodeEditor.IEditor[] = [];
    this.notebookTracker.forEach(notebookPanel => {
      const session = notebookPanel.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      notebookPanel.content.mode = 'command';
      const cells = notebookPanel.content.widgets;
      cells.forEach((cell, i) => {
        // check the event is for the correct cell
        const code = cell.model.value.text;
        const cellId = this.debuggerService.getCodeId(code);
        if (source !== cellId) {
          return;
        }
        notebookPanel.content.activeCellIndex = i;
        // TODO: scroll to center on the active cell
        editors.push(cell.editor);
      });
    });
    return editors;
  }

  protected findInConsoles(debugSessionPath: string, source: string) {
    if (!this.consoleTracker) {
      return [];
    }
    let editors: CodeEditor.IEditor[] = [];
    this.consoleTracker.forEach(consoleWidget => {
      const session = consoleWidget.session;

      if (session.path !== debugSessionPath) {
        return;
      }

      const editor = consoleWidget?.console.promptCell?.editor ?? null;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
    });
    return editors;
  }

  protected findInEditors(debugSessionPath: string, source: string) {
    if (!this.editorTracker) {
      return;
    }
    let editors: CodeEditor.IEditor[] = [];
    this.editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (debugSessionPath !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
    });
    return editors;
  }

  private debuggerService: IDebugger;
  private notebookTracker: INotebookTracker | null;
  private consoleTracker: IConsoleTracker | null;
  private editorTracker: IEditorTracker | null;
}

/**
 * A namespace for DebuggerTrackerHandler statics.
 */
export namespace DebuggerTrackerHandler {
  /**
   * The options used to initialize a DebuggerTrackerHandler object.
   */
  export interface IOptions {
    debuggerService: IDebugger;
    notebookTracker?: INotebookTracker;
    consoleTracker?: IConsoleTracker;
    editorTracker?: IEditorTracker;
  }
}
