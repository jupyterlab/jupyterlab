// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  CodeEditor
} from '../codeeditor';

import {
  CompleterWidget
} from './widget';


/**
 * A class added to editors that can host a completer.
 */
export
const COMPLETABLE_CLASS: string = 'jp-mod-completable';


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
      editor.host.classList.remove(COMPLETABLE_CLASS);
      editor.model.value.changed.disconnect(this.onTextChanged, this);
    }

    // Reset completer state.
    this._completer.reset();

    // Update the editor.
    editor = this._editor = newValue;
    if (editor) {
      editor.model.value.changed.connect(this.onTextChanged, this);
    }
  }


  /**
   * Get whether the completion handler is disposed.
   */
  get isDisposed(): boolean {
    return this._completer === null;
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
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    this._completer = null;
    this._kernel = null;
    this._editor = null;
  }

  /**
   * Invoke the handler and launch a completer.
   */
  invoke(): void {
    MessageLoop.sendMessage(this, CompletionHandler.Msg.InvokeRequest);
  }

  /**
   * Process a message sent to the completion handler.
   */
  processMessage(msg: Message): void {
    switch (msg.type) {
    case CompletionHandler.Msg.InvokeRequest.type:
      this.onInvokeRequest(msg);
      break;
    default:
      break;
    }
  }

  /**
   * Get the state of the text editor at the given position.
   */
  protected getState(position: CodeEditor.IPosition): CompleterWidget.ITextState {
    let editor = this.editor;
    let coords = editor.getCoordinate(position) as CompleterWidget.ICoordinate;
    return {
      text: editor.model.value.text,
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
      coords,
      line: position.line,
      column: position.column
    };
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
   * Handle `invoke-request` messages.
   */
  protected onInvokeRequest(msg: Message): void {
    // If there is neither a kernel or a completer model, bail.
    if (!this._kernel || !this._completer.model) {
      return;
    }

    // If a completer session is already active, bail.
    if (this._completer.model.original) {
      return;
    }

    let editor = this._editor;
    this.makeRequest(editor.getCursorPosition());
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
      model.reset(true);
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
    const model = this._completer.model;
    if (!model) {
      return;
    }

    const editor = this.editor;
    const host = editor.host;

    // Set the host to a blank slate.
    host.classList.remove(COMPLETABLE_CLASS);

    // If there is a text selection, no completion is allowed.
    const { start, end } = editor.getSelection();
    if (start.column !== end.column || start.line !== end.line) {
      return;
    }

    // Allow completion if the current or a preceding char is not whitespace.
    const position = editor.getCursorPosition();
    const currentLine = editor.getLine(position.line);
    if (!currentLine.substring(0, position.column).match(/\S/)) {
      model.reset();
      return;
    }

    const request = this.getState(position);

    host.classList.add(COMPLETABLE_CLASS);

    this._completer.model.handleTextChange(request);
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

    let { offset, text } = patch;
    editor.model.value.text = text;

    let position = editor.getPositionAt(offset);
    editor.setCursorPosition(position);
  }

  private _editor: CodeEditor.IEditor | null = null;
  private _completer: CompleterWidget | null = null;
  private _kernel: Kernel.IKernel | null = null;
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

  /**
   * A namespace for completion handler messages.
   */
  export
  namespace Msg {
    /* tslint:disable */
    /**
     * A singleton `'invoke-request'` message.
     */
    export
    const InvokeRequest = new Message('invoke-request');
    /* tslint:enable */
  }
}
