// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { ISessionContext } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { KernelMessage } from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

/**
 * The definition of a console history manager object.
 */
export interface INotebookHistory extends IDisposable {
  /**
   * The current editor used by the history widget.
   */
  editor: CodeEditor.IEditor | null;

  /**
   * The placeholder text that a history session began with.
   */
  readonly placeholder: string;

  /**
   * The session number of the current kernel session
   */
  readonly kernelSession: string;

  /**
   * Get the previous item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(activeCell: Cell): Promise<string | undefined>;

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(activeCell: Cell): Promise<string | undefined>;

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void;

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   * @param content - the result from back or forward
   */
  updateEditor(activeCell: Cell, content: string | undefined): void;
}

/**
 * A console history manager object.
 */
export class NotebookHistory implements INotebookHistory {
  /**
   * Construct a new console history object.
   */
  constructor(options: NotebookHistory.IOptions) {
    this._sessionContext = options.sessionContext;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    void this._handleKernel().then(() => {
      this._sessionContext.kernelChanged.connect(this._handleKernel, this);
    });
    this._toRequest = this._requestBatchSize;
  }

  /**
   * The client session used to query history.
   */
  private _sessionContext: ISessionContext;

  /**
   * Translator to be used for warnings
   */
  private _trans: TranslationBundle;

  /**
   * The number of history items to request.
   */
  private _toRequest: number;

  /**
   * The number of history items to increase a batch size by per subsequent request.
   */
  private _requestBatchSize: number = 10;

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
   * Get whether the notebook history manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the notebook history manager.
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
  protected async checkSession(activeCell: Cell): Promise<void> {
    if (!this._hasSession) {
      await this._retrieveHistory();
      this._hasSession = true;
      this.editor = activeCell.editor;
      this._placeholder = this._editor?.model.sharedModel.getSource() || '';
      // Filter the history with the placeholder string.
      this.setFilter(this._placeholder);
      this._cursor = this._filtered.length - 1;
    }
  }

  /**
   * Get the previous item in the notebook history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise resolving to the historical cell content text.
   */
  async back(activeCell: Cell): Promise<string | undefined> {
    await this.checkSession(activeCell);
    --this._cursor;
    if (this._cursor < 0) {
      await this.fetchBatch();
    }
    this._cursor = Math.max(0, this._cursor);
    const content = this._filtered[this._cursor];
    // This shouldn't ever be undefined as `setFilter` will always be run first
    return content;
  }

  /**
   * Get the next item in the notebook history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise resolving to the historical cell content text.
   */
  async forward(activeCell: Cell): Promise<string | undefined> {
    await this.checkSession(activeCell);
    ++this._cursor;
    this._cursor = Math.min(this._filtered.length - 1, this._cursor);
    const content = this._filtered[this._cursor];
    // This shouldn't ever be undefined as `setFilter` will always be run first
    return content;
  }

  /**
   * Update the editor of the cell with provided text content.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   * @param content - the result from back or forward
   */
  updateEditor(activeCell: Cell, content: string | undefined): void {
    if (activeCell) {
      const model = activeCell.editor?.model;
      const source = model?.sharedModel.getSource();
      if (this.isDisposed || !content) {
        return;
      }
      if (source === content) {
        return;
      }
      this._setByHistory = true;
      model?.sharedModel.setSource(content);
      let columnPos = 0;
      columnPos = content.indexOf('\n');
      if (columnPos < 0) {
        columnPos = content.length;
      }
      activeCell.editor?.setCursorPosition({ line: 0, column: columnPos });
    }
  }

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void {
    this._hasSession = false;
    this._placeholder = '';
    this._toRequest = this._requestBatchSize;
  }

  /**
   * Fetches a subsequent batch of history. Updates the filtered history and cursor to correct place in history,
   * accounting for potentially new history items above it.
   */
  private async fetchBatch() {
    this._toRequest += this._requestBatchSize;
    let oldFilteredReversed = this._filtered.slice().reverse();
    let oldHistory = this._history.slice();
    await this._retrieveHistory().then(() => {
      this.setFilter(this._placeholder);
      let cursorOffset = 0;
      let filteredReversed = this._filtered.slice().reverse();
      for (let i = 0; i < oldFilteredReversed.length; i++) {
        let item = oldFilteredReversed[i];
        for (let ij = i + cursorOffset; ij < filteredReversed.length; ij++) {
          if (item === filteredReversed[ij]) {
            break;
          } else {
            cursorOffset += 1;
          }
        }
      }
      this._cursor =
        this._filtered.length - (oldFilteredReversed.length + 1) - cursorOffset;
    });
    if (this._cursor < 0) {
      if (this._history.length > oldHistory.length) {
        await this.fetchBatch();
      }
    }
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
    this._kernel = this._sessionContext.session?.kernel;
    if (!this._kernel) {
      this._history.length = 0;
      return;
    }
    await this._retrieveHistory().catch();
    return;
  }

  /**
   * retrieve the history from the kernel
   *
   * @param cell - The string to use when filtering the data.
   */
  private async _retrieveHistory(cell?: Cell): Promise<void> {
    return await this._kernel
      ?.requestHistory(request(this._toRequest))
      .then(v => {
        this.onHistory(v, cell);
      })
      .catch(() => {
        console.warn(this._trans.__('History was unable to be retrieved'));
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

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

function request(n: number): KernelMessage.IHistoryRequestMsg['content'] {
  return {
    output: false,
    raw: true,
    hist_access_type: 'tail',
    n: n
  };
}
