// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { ISessionContext } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { KernelMessage } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
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
   * Translator to be used for warnings.
   */
  readonly translator: ITranslator;

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
  back(activeCell: Cell): Promise<string>;

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(activeCell: Cell): Promise<string>;

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void;

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   * @param update - the promise returned from back or forward
   */
  updateEditor(activeCell: Cell, update: string): void;
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
    this.translator = options.translator || nullTranslator;
    void this._handleKernel();
    this.sessionContext.kernelChanged.connect(this._handleKernel, this);
  }

  /**
   * The client session used by the foreign handler.
   */
  readonly sessionContext: ISessionContext;

  /**
   * Translator to be used for warnings
   */
  readonly translator: ITranslator;

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
   * Get the previous item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  async back(activeCell: Cell): Promise<string> {
    await this.checkSession(activeCell);
    --this._cursor;
    this._cursor = Math.max(0, this._cursor);
    const content = this._filtered[this._cursor];
    return content;
  }

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  async forward(activeCell: Cell): Promise<string> {
    await this.checkSession(activeCell);
    ++this._cursor;
    this._cursor = Math.min(this._filtered.length - 1, this._cursor);
    const content = this._filtered[this._cursor];
    return content;
  }

  /**
   * Get the next item in the console history.
   *
   * @param activeCell - The currently selected Cell in the notebook.
   * @param update - the promise returned from back or forward
   */
  updateEditor(activeCell: Cell, update: string): void {
    if (activeCell) {
      const model = activeCell.editor?.model;
      const source = model?.sharedModel.getSource();
      if (this.isDisposed || !update) {
        return;
      }
      if (source === update) {
        return;
      }
      this._setByHistory = true;
      model?.sharedModel.setSource(update);
      let columnPos = 0;
      columnPos = update.indexOf('\n');
      if (columnPos < 0) {
        columnPos = update.length;
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
      ?.requestHistory(Private.initialRequest)
      .then(v => {
        this.onHistory(v, cell);
      })
      .catch(() => {
        console.warn(
          this.translator
            .load('jupyterlab')
            .__('History was unable to be retrieved')
        );
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
    translator: ITranslator;
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
