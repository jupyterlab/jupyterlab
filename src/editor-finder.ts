// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { chain, each, IIterator } from '@lumino/algorithm';

import { Token } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { IDebuggerConfig } from './debugger-configuration';

/**
 * A class to find instances of code editors across notebook, console and files widgets
 */
export class EditorFinder implements IDisposable, IDebuggerEditorFinder {
  /**
   * Instantiate a new EditorFinder.
   *
   * @param options The instantiation options for a EditorFinder.
   */
  constructor(options: EditorFinder.IOptions) {
    this._shell = options.shell;
    this._notebookTracker = options.notebookTracker;
    this._consoleTracker = options.consoleTracker;
    this._editorTracker = options.editorTracker;
    this._debuggerConfiguration = options.debuggerConfiguration;
    this._readOnlyEditorTracker = new WidgetTracker<
      MainAreaWidget<CodeEditorWrapper>
    >({
      namespace: '@jupyterlab/debugger'
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
   * Find the editor for a source matching the current debug session
   * by iterating through all the widgets in each of the notebook,
   * console, file editor, and read-only file editor trackers.
   *
   * @param findParams - Unified parameters for a source matching
   */
  find(findParams: IFindParameters): IIterator<CodeEditor.IEditor> {
    return chain(
      this._findInNotebooks(findParams),
      this._findInConsoles(findParams),
      this._findInEditors(findParams),
      this._findInReadOnlyEditors(findParams)
    );
  }

  /**
   * Find the editor for a source matching the current debug session
   *
   * @param findParams - Unified parameters for a source matching
   */
  private _findInNotebooks(findParams: IFindParameters): CodeEditor.IEditor[] {
    if (!this._notebookTracker) {
      return [];
    }
    const { debugSessionPath, source, focus, kernelName } = findParams;

    const editors: CodeEditor.IEditor[] = [];
    this._notebookTracker.forEach(notebookPanel => {
      const sessionContext = notebookPanel.sessionContext;

      if (sessionContext.path !== debugSessionPath) {
        return;
      }

      const notebook = notebookPanel.content;
      if (focus) {
        notebook.mode = 'command';
      }

      const cells = notebookPanel.content.widgets;
      cells.forEach((cell, i) => {
        // check the event is for the correct cell
        const code = cell.model.value.text;
        const cellId = this._debuggerConfiguration.getCodeId(code, kernelName);
        if (source !== cellId) {
          return;
        }
        if (focus) {
          notebook.activeCellIndex = i;
          const rect = notebook.activeCell.inputArea.node.getBoundingClientRect();
          notebook.scrollToPosition(rect.bottom, 45);
          this._shell.activateById(notebookPanel.id);
        }
        editors.push(cell.editor);
      });
    });
    return editors;
  }

  /**
   * Find the editor for a source matching the current debug session
   *
   * @param findParams - Unified parameters for a source matching
   */
  private _findInConsoles(findParams: IFindParameters): CodeEditor.IEditor[] {
    if (!this._consoleTracker) {
      return [];
    }
    const { debugSessionPath, source, focus, kernelName } = findParams;

    const editors: CodeEditor.IEditor[] = [];
    this._consoleTracker.forEach(consoleWidget => {
      const sessionContext = consoleWidget.sessionContext;

      if (sessionContext.path !== debugSessionPath) {
        return;
      }

      const cells = consoleWidget.console.cells;
      each(cells, cell => {
        const code = cell.model.value.text;
        const codeId = this._debuggerConfiguration.getCodeId(code, kernelName);
        if (source !== codeId) {
          return;
        }
        editors.push(cell.editor);
        if (focus) {
          this._shell.activateById(consoleWidget.id);
        }
      });
    });
    return editors;
  }

  /**
   * Find the editor for a source matching the current debug session
   * from the editor tracker.
   *
   * @param findParams - Unified parameters for a source matching
   */
  private _findInEditors(findParams: IFindParameters): CodeEditor.IEditor[] {
    if (!this._editorTracker) {
      return;
    }
    const { debugSessionPath, source, focus, kernelName } = findParams;

    const editors: CodeEditor.IEditor[] = [];
    this._editorTracker.forEach(doc => {
      const fileEditor = doc.content;
      if (debugSessionPath !== fileEditor.context.path) {
        return;
      }

      const editor = fileEditor.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._debuggerConfiguration.getCodeId(code, kernelName);
      if (source !== codeId) {
        return;
      }
      editors.push(editor);
      if (focus) {
        this._shell.activateById(doc.id);
      }
    });
    return editors;
  }

  /**
   * Find an editor for a source from the read-only editor tracker.
   *
   * @param findParams - Unified parameters for a source matching
   */
  private _findInReadOnlyEditors(
    findParams: IFindParameters
  ): CodeEditor.IEditor[] {
    const { source, focus, kernelName } = findParams;

    const editors: CodeEditor.IEditor[] = [];
    this._readOnlyEditorTracker.forEach(widget => {
      const editor = widget.content?.editor;
      if (!editor) {
        return;
      }

      const code = editor.model.value.text;
      const codeId = this._debuggerConfiguration.getCodeId(code, kernelName);
      if (widget.title.caption !== source && source !== codeId) {
        return;
      }
      editors.push(editor);
      if (focus) {
        this._shell.activateById(widget.id);
      }
    });
    return editors;
  }
  private _shell: JupyterFrontEnd.IShell;
  private _readOnlyEditorTracker: WidgetTracker<
    MainAreaWidget<CodeEditorWrapper>
  >;
  private _notebookTracker: INotebookTracker | null;
  private _consoleTracker: IConsoleTracker | null;
  private _editorTracker: IEditorTracker | null;
  private _debuggerConfiguration: IDebuggerConfig;
}
/**
 * A namespace for editor finder statics.
 */
export namespace EditorFinder {
  /**
   * The options used to initialize a EditorFinder object.
   */
  export interface IOptions {
    /**
     * An optional editor finder for consoles.
     */
    consoleTracker?: IConsoleTracker;

    /**
     * The editor services.
     */
    editorServices: IEditorServices;

    /**
     * An optional editor finder for file editors.
     */
    editorTracker?: IEditorTracker;

    /**
     * An optional editor finder for notebooks.
     */
    notebookTracker?: INotebookTracker;

    /**
     * The application shell.
     */
    shell: JupyterFrontEnd.IShell;

    /**
     * The instance of configuration with hash method.
     */
    debuggerConfiguration: IDebuggerConfig;
  }
}

/**
 * Unified parameters for find method
 */
interface IFindParameters {
  /**
   * Path of session connection.
   */
  debugSessionPath: string;

  /**
   * Source path
   */
  source: string;

  /**
   * Extra flag prevent disable focus.
   */
  focus: boolean;

  /**
   * Name of current kernel.
   */
  kernelName: string;
}

/**
 * A token for a editor finder handler find method plugin
 *
 */
export const IDebuggerEditorFinder = new Token<IDebuggerEditorFinder>(
  '@jupyterlab/debugger:editor-finder'
);

/**
 * Interface for separated find method from editor finder plugin
 */
export interface IDebuggerEditorFinder {
  find(findParams: IFindParameters): IIterator<CodeEditor.IEditor>;
}
