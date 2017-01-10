// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  CodeEditor
} from '../codeeditor';

import {
  BaseCellWidget
} from '../notebook/cells/widget';

import {
  CompleterWidget
} from './widget';


/**
 * A completer handler for cell widgets.
 */
export
class CellCompleterHandler implements IDisposable {
  /**
   * Construct a new completer handler for a widget.
   */
  constructor(options: CellCompleterHandler.IOptions) {
    this._completer = options.completer;
    this._completer.selected.connect(this.onCompletionSelected, this);
    this._completer.visibilityChanged.connect(this.onVisibilityChanged, this);
    this._kernel = options.kernel || null;
  }

  /**
   * The kernel used by the completer handler.
   */
  get kernel(): Kernel.IKernel {
    return this._kernel;
  }
  set kernel(value: Kernel.IKernel) {
    this._kernel = value;
  }

  /**
   * The cell widget used by the completer handler.
   */
  get activeCell(): BaseCellWidget {
    return this._activeCell;
  }
  set activeCell(newValue: BaseCellWidget) {
    if (newValue === this._activeCell) {
      return;
    }

    if (this._activeCell && !this._activeCell.isDisposed) {
      const editor = this._activeCell.editor;
      editor.model.value.changed.disconnect(this.onTextChanged, this);
      editor.completionRequested.disconnect(this.onCompletionRequested, this);
    }
    this._activeCell = newValue;
    if (this._activeCell) {
      const editor = this._activeCell.editor;
      editor.model.value.changed.connect(this.onTextChanged, this);
      editor.completionRequested.connect(this.onCompletionRequested, this);
    }
  }

  /**
   * Get whether the completer handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._completer === null;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._completer = null;
    this._kernel = null;
    this._activeCell = null;
  }

  /**
   * Make a complete request using the kernel.
   */
  protected makeRequest(position: CodeEditor.IPosition): Promise<void> {
    if (!this._kernel) {
      return Promise.reject(new Error('no kernel for completion request'));
    }

    let cell = this.activeCell;
    if (!cell) {
      return Promise.reject(new Error('No active cell'));
    }

    let offset = cell.editor.getOffsetAt(position);

    let content: KernelMessage.ICompleteRequest = {
      code: cell.model.value.text,
      cursor_pos: offset
    };
    let pending = ++this._pending;

    let request = this.getState(position);

    return this._kernel.requestComplete(content).then(msg => {
      this.onReply(pending, request, msg);
    });
  }

  /**
   * Get the state of the text editor at the given position.
   */
  protected getState(position: CodeEditor.IPosition): CompleterWidget.ITextState {
    let editor = this.activeCell.editor;
    let coords = editor.getCoordinate(position) as CompleterWidget.ICoordinate;
    return {
      text: editor.getLine(position.line),
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
      coords,
      line: position.line,
      column: position.column
    }
  }

  /**
   * Receive a completion reply from the kernel.
   */
  protected onReply(pending: number, request: CompleterWidget.ITextState, msg: KernelMessage.ICompleteReplyMsg): void {
    // If we have been disposed, bail.
    if (this.isDisposed) {
      return;
    }
    // If a newer completion request has created a pending request, bail.
    if (pending !== this._pending) {
      return;
    }
    let value = msg.content;
    let model = this._completer.model;
    if (!model) {
      return;
    }
    // Completion request failures or negative results fail silently.
    if (value.status !== 'ok') {
      model.reset();
      return;
    }
    // Update the original request.
    model.original = request;
    // Update the options.
    model.setOptions(value.matches || []);
    // Update the cursor.
    model.cursor = { start: value.cursor_start, end: value.cursor_end };
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(): void {
    if (!this._completer.model) {
      return;
    }
    let editor = this.activeCell.editor;
    let position = editor.getCursorPosition();
    let request = this.getState(position);
    this._completer.model.handleTextChange(request);
  }

  /**
   * Handle a completion requested signal from an editor.
   */
  protected onCompletionRequested(editor: CodeEditor.IEditor, position: CodeEditor.IPosition): void {
    if (!this._kernel || !this._completer.model) {
      return;
    }
    this.makeRequest(position);
  }


  /**
   * Handle a visiblity change signal from a completer widget.
   */
  protected onVisibilityChanged(completer: CompleterWidget): void {
    if (completer.isDisposed || completer.isHidden) {
      if (this._activeCell) {
        this._activeCell.activate();
      }
    }
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(widget: CompleterWidget, value: string): void {
    if (!this._activeCell || !this._completer.model) {
      return;
    }
    let patch = this._completer.model.createPatch(value);
    if (!patch) {
      return;
    }
    let cell = this._activeCell;
    cell.model.value.text = patch.text;
    let editor = cell.editor;
    editor.setCursorPosition(editor.getPositionAt(patch.position));
  }

  private _activeCell: BaseCellWidget = null;
  private _completer: CompleterWidget = null;
  private _kernel: Kernel.IKernel = null;
  private _pending = 0;
}


/**
 * A namespace for cell completer handler statics.
 */
export
namespace CellCompleterHandler {
  /**
   * The instantiation options for cell completer handlers.
   */
  export
  interface IOptions {
    /**
     * The completer widget the handler will connect to.
     */
    completer: CompleterWidget;

    /**
     * The kernel for the completer handler.
     */
    kernel?: Kernel.IKernel;
  }
}
