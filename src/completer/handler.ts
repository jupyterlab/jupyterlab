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
  CompleterWidget
} from './widget';


/**
 * A completion handler for editors.
 */
export
class CompletionHandler implements IDisposable {
  /**
   * Construct a new completion handler for a widget.
   */
  constructor(options: CompletionHandler.IOptions) {
    this._completer = options.completer;
    this._completer.selected.connect(this.onCompletionSelected, this);
    this._completer.visibilityChanged.connect(this.onVisibilityChanged, this);
    this._kernel = options.kernel || null;
  }

  /**
   * The kernel used by the completion handler.
   */
  get kernel(): Kernel.IKernel {
    return this._kernel;
  }
  set kernel(value: Kernel.IKernel) {
    this._kernel = value;
  }

  /**
   * The editor used by the completion handler.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor) {
    if (newValue === this._editor) {
      return;
    }

    let editor = this._editor;
    if (editor && !editor.isDisposed) {
      editor.model.value.changed.disconnect(this.onTextChanged, this);
      editor.completionRequested.disconnect(this.onCompletionRequested, this);
    }

    editor = this._editor = newValue;
    if (editor) {
      editor.model.value.changed.connect(this.onTextChanged, this);
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
    return this._completer === null;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    this._completer = null;
    this._kernel = null;
    this._editor = null;
  }

  /**
   * Make a complete request using the kernel.
   */
  protected makeRequest(position: CodeEditor.IPosition): Promise<void> {
    if (!this._kernel) {
      return Promise.reject(new Error('no kernel for completion request'));
    }

    let editor = this.editor;
    if (!editor) {
      return Promise.reject(new Error('No active editor'));
    }

    let offset = editor.getOffsetAt(position);

    let content: KernelMessage.ICompleteRequest = {
      code: editor.model.value.text,
      cursor_pos: offset
    };
    let pending = ++this._pending;

    let request = this.getState(position);

    return this._kernel.requestComplete(content).then(msg => {
      if (this.isDisposed) {
        return;
      }
      this.onReply(pending, request, msg);
    });
  }

  /**
   * Get the state of the text editor at the given position.
   */
  protected getState(position: CodeEditor.IPosition): CompleterWidget.ITextState {
    let editor = this.editor;
    let coords = editor.getCoordinate(position) as CompleterWidget.ICoordinate;
    return {
      text: editor.getLine(position.line),
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
      coords,
      line: position.line,
      column: position.column
    };
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
    let editor = this.editor;
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
   * Handle a visiblity change signal from a completion widget.
   */
  protected onVisibilityChanged(completion: CompleterWidget): void {
    if (completion.isDisposed || completion.isHidden) {
      if (this._editor) {
        this._editor.focus();
      }
    }
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(widget: CompleterWidget, value: string): void {
    let model = this._completer.model;
    let editor = this._editor;
    if (!editor || !model) {
      return;
    }
    let patch = model.createPatch(value);
    if (!patch) {
      return;
    }
    if (!model.cursor || !model.original) {
      return;
    }
    let { start, end, text } = patch;
    editor.model.value.remove(start, end);
    editor.model.value.insert(start, text);
    let pos = editor.getPositionAt(start);
    editor.setCursorPosition({
      line: pos.line,
      column: pos.column + text.length
    });
  }

  private _editor: CodeEditor.IEditor = null;
  private _completer: CompleterWidget = null;
  private _kernel: Kernel.IKernel = null;
  private _pending = 0;
}


/**
 * A namespace for cell completion handler statics.
 */
export
namespace CompletionHandler {
  /**
   * The instantiation options for cell completion handlers.
   */
  export
  interface IOptions {
    /**
     * The completion widget the handler will connect to.
     */
    completer: CompleterWidget;

    /**
     * The kernel for the completion handler.
     */
    kernel?: Kernel.IKernel;
  }
}
