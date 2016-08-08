// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  isCellEditorWidgetExtension, ICellEditorWidgetExtension, ITextChange, ICompletionRequest
} from '../cells/editor';

import {
  BaseCellWidget
} from '../cells/widget';

import {
  CompletionWidget
} from './widget';


/**
 * A completion handler for cell widgets.
 */
export
class CellCompletionHandler implements IDisposable {
  /**
   * Construct a new completion handler for a widget.
   */
  constructor(completion: CompletionWidget) {
    this._completion = completion;
    this._completion.selected.connect(this.onCompletionSelected, this);
  }

  /**
   * The kernel used by the completion handler.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(value: IKernel) {
    this._kernel = value;
  }

  /**
   * The cell widget used by the completion handler.
   */
  get activeCell(): BaseCellWidget {
    return this._activeCell;
  }
  set activeCell(newValue: BaseCellWidget) {
    if (newValue === this._activeCell) {
      return;
    }

    if (this._activeCell && !this._activeCell.isDisposed && isCellEditorWidgetExtension(this._activeCell.editor)) {
      const editor = <ICellEditorWidgetExtension>this._activeCell.editor;
      editor.textChanged.disconnect(this.onTextChanged, this);
      editor.completionRequested.disconnect(this.onCompletionRequested, this);
    }
    this._activeCell = newValue;
    if (this._activeCell && isCellEditorWidgetExtension(this._activeCell.editor)) {
      const editor = <ICellEditorWidgetExtension>this._activeCell.editor;
      editor.textChanged.connect(this.onTextChanged, this);
      editor.completionRequested.connect(this.onCompletionRequested, this);
    }
  }

  /**
   * Get whether the completion handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._completion === null;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._completion = null;
    this._kernel = null;
    this._activeCell = null;
  }

  /**
   * Make a completion request using the kernel.
   */
  protected makeRequest(request: ICompletionRequest): Promise<void> {
    if (!this._kernel) {
      return Promise.reject(new Error('no kernel for completion request'));
    }

    let content: KernelMessage.ICompleteRequest = {
      code: request.currentValue,
      cursor_pos: request.position
    };
    let pending = ++this._pending;

    return this._kernel.complete(content).then(msg => {
      this.onReply(pending, request, msg);
    });
  }

  /**
   * Receive a completion reply from the kernel.
   */
  protected onReply(pending: number, request: ICompletionRequest, msg: KernelMessage.ICompleteReplyMsg): void {
    // If we have been disposed, bail.
    if (this.isDisposed) {
      return;
    }
    // If a newer completion request has created a pending request, bail.
    if (pending !== this._pending) {
      return;
    }
    let value = msg.content;
    let model = this._completion.model;
    // Completion request failures or negative results fail silently.
    if (value.status !== 'ok') {
      model.reset();
      return;
    }
    // Update the original request.
    model.original = request;
    // Update the options.
    model.options = value.matches;
    // Update the cursor.
    model.cursor = { start: value.cursor_start, end: value.cursor_end };
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(editor: ICellEditorWidgetExtension, change: ITextChange): void {
    if (!this._completion.model) {
      return;
    }
    this._completion.model.handleTextChange(change);
  }

  /**
   * Handle a completion requested signal from an editor.
   */
  protected onCompletionRequested(editor: ICellEditorWidgetExtension, request: ICompletionRequest): void {
    if (!this.kernel || !this._completion.model) {
      return;
    }
    this.makeRequest(request);
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(widget: CompletionWidget, value: string): void {
    if (!this._activeCell || !this._completion.model) {
      return;
    }
    let patch = this._completion.model.createPatch(value);
    if (!patch) {
      return;
    }
    let cell = this._activeCell;
    cell.model.source = patch.text;
    cell.editor.setCursorPosition(patch.position);
  }

  private _activeCell: BaseCellWidget = null;
  private _completion: CompletionWidget = null;
  private _kernel: IKernel = null;
  private _pending = 0;
}
