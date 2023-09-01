// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { ISessionContext } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { NotebookActions } from './actions';
import { StaticNotebook } from './widget';
import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

/**
 * The definition of a console history manager object.
 */
export interface INotebookHistory extends IDisposable {
  /**
   * The session context used by the foreign handler.
   */
  readonly sessionContext: ISessionContext;

  /**
   * The current editor used by the history widget.
   */
  editor: CodeEditor.IEditor | null;

  /**
   * The placeholder text that a history session began with.
   */
  readonly placeholder: string;

  readonly kernelSession: string;

  /**
   * Get the previous item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  // back(placeholder: string): string;
  back(activeCell: Cell): Promise<string>;

  /**
   * Get the next item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(activeCell: Cell): Promise<string>;
  // forward(placeholder: string): string;

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the console's history will consist of no contiguous repetitions.
   */
  // push(item: string): void;

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void;

  updateEditor(activeCell: Cell, update: Promise<string>): void;
}

/**
 * A console history manager object.
 */
export class NotebookHistory implements INotebookHistory {
  /**
   * Construct a new console history object.
   */
  constructor(options: NotebookHistory.IOptions) {
    this.sessionContext = options.sessionContext;
    void this._handleKernel();
    this.sessionContext.kernelChanged.connect(this._handleKernel, this);
    NotebookActions.executed.connect(this._onExecuted, this);
  }

  /**
   * The client session used by the foreign handler.
   */
  readonly sessionContext: ISessionContext;

  /**
   * The current editor used by the history manager.
   */
  get editor(): CodeEditor.IEditor | null {
    return this._editor;
  }

  set editor(value: CodeEditor.IEditor | null) {
    if (this._editor === value) {
      return;
    }

    const prev = this._editor;
    if (prev) {
      prev.model.sharedModel.changed.disconnect(this.onTextChange, this);
    }

    this._editor = value;

    if (value) {
      value.model.sharedModel.changed.connect(this.onTextChange, this);
    }
  }

  /**
   * The placeholder text that a history session began with.
   */
  get placeholder(): string {
    return this._placeholder;
  }

  /**
   * Kernel session number for filtering
   */
  get kernelSession(): string {
    return this._kernelSession;
  }

  /**
   * Get whether the console history manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the console history manager.
   */
  dispose(): void {
    this._isDisposed = true;
    this._history.length = 0;
    Signal.clearData(this);
  }

  /**
   * Set placeholder and editor. Start session if one is not already started.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   */
  protected checkSession(activeCell: Cell): void {
    if (!this._hasSession) {
      this._hasSession = true;
      this.editor = activeCell.editor;
      this._placeholder = this._editor?.model.sharedModel.getSource() || '';
      // Filter the history with the placeholder string.
      this.setFilter(this._placeholder);
      this._cursor = this._filtered.length - 1;
    }
  }

  /**
   * Get the previous item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(activeCell: Cell): Promise<string> {
    this.checkSession(activeCell);
    --this._cursor;
    this._cursor = Math.max(0, this._cursor);
    const content = this._filtered[this._cursor];
    console.log('this._cursor: ', this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(activeCell: Cell): Promise<string> {
    this.checkSession(activeCell);
    ++this._cursor;
    this._cursor = Math.min(this._filtered.length - 1, this._cursor);
    const content = this._filtered[this._cursor];
    // return content;
    return Promise.resolve(content);
  }

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   * @param update - the promise returned from back or forward
   */
  updateEditor(activeCell: Cell, update: Promise<string>): void {
    if (activeCell) {
      void update.then(value => {
        const model = activeCell.editor?.model;
        const source = model?.sharedModel.getSource();
        if (this.isDisposed || !value) {
          return;
        }
        if (source === value) {
          return;
        }
        this._setByHistory = true;
        model?.sharedModel.setSource(value);
        let columnPos = 0;
        columnPos = value.indexOf('\n');
        if (columnPos < 0) {
          columnPos = value.length;
        }
        activeCell.editor?.setCursorPosition({ line: 0, column: columnPos });
      });
    }
  }

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void {
    this._hasSession = false;
    this._placeholder = '';
    this._retrieveHistory();
  }

  /**
   * Populate the history collection on history reply from a kernel.
   *
   * @param value The kernel message history reply.
   *
   * #### Notes
   * History entries have the shape:
   * [session: number, line: number, input: string]
   * Contiguous duplicates are stripped out of the API response.
   */
  protected onHistory(
    value: KernelMessage.IHistoryReplyMsg,
    cell?: Cell
  ): void {
    this._history.length = 0;
    let last = ['', '', ''];
    let current = ['', '', ''];
    let kernelSession = '';
    if (value.content.status === 'ok') {
      for (let i = 0; i < value.content.history.length; i++) {
        current = value.content.history[i] as string[];
        if (current !== last) {
          kernelSession = (value.content.history[i] as string[])[0];
          this._history.push((last = current));
        }
      }
      // set the kernel session for filtering
      if (!this.kernelSession) {
        if (current[2] == cell?.model.sharedModel.getSource()) {
          this._kernelSession = kernelSession;
        }
      }
    }
  }

  /**
   * Handle a text change signal from the editor.
   */
  protected onTextChange(): void {
    if (this._setByHistory) {
      this._setByHistory = false;
      return;
    }
    this.reset();
  }

  /**
   * Handle the current kernel changing.
   */
  private async _handleKernel(): Promise<void> {
    this._kernel = this.sessionContext.session?.kernel;
    if (!this._kernel) {
      this._history.length = 0;
      return;
    }
    return this._retrieveHistory();
  }

  /**
   * handle a cell execution
   */
  private async _onExecuted(
    _: unknown,
    args: { notebook: StaticNotebook; cell: Cell }
  ): Promise<void> {
    const cell = args['cell'];
    this._retrieveHistory(cell);
  }

  /**
   * retrieve the history from the kernel
   *
   * @param cell - The string to use when filtering the data.
   */
  private async _retrieveHistory(cell?: Cell): Promise<void> {
    return this._kernel?.requestHistory(Private.initialRequest).then(v => {
      this.onHistory(v, cell);
    });
  }

  /**
   * Set the filter data.
   *
   * @param filterStr - The string to use when filtering the data.
   */
  protected setFilter(filterStr: string = ''): void {
    // Apply the new filter and remove contiguous duplicates.
    this._filtered.length = 0;

    let last = '';
    let current = '';
    for (let i = 0; i < this._history.length; i++) {
      current = this._history[i][2] as string;
      if (current !== last && filterStr !== current) {
        this._filtered.push((last = current));
      }
    }
    this._filtered.push(filterStr);
  }

  private _cursor = 0;
  private _hasSession = false;
  private _history: Array<Array<string>> = [];
  private _placeholder: string = '';
  private _kernelSession: string = '';
  private _setByHistory = false;
  private _isDisposed = false;
  private _editor: CodeEditor.IEditor | null = null;
  private _filtered: string[] = [];
  private _kernel: IKernelConnection | null | undefined = null;
}

/**
 * A namespace for NotebookHistory statics.
 */
export namespace NotebookHistory {
  /**
   * The initialization options for a console history object.
   */
  export interface IOptions {
    /**
     * The client session used by the foreign handler.
     */
    sessionContext: ISessionContext;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  export const initialRequest: KernelMessage.IHistoryRequestMsg['content'] = {
    output: false,
    raw: true,
    hist_access_type: 'tail',
    n: 500
  };
}
