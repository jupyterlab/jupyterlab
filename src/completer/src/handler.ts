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
} from '@jupyterlab/codeeditor';

import {
  CompleterWidget
} from './widget';


/**
 * A class added to editors that can host a completer.
 */
export
const COMPLETER_ENABLED_CLASS: string = 'jp-mod-completer-enabled';

/**
 * A class added to editors that have an active completer.
 */
export
const COMPLETER_ACTIVE_CLASS: string = 'jp-mod-completer-active';


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
   * The completer widget managed by the handler.
   */
  get completer(): CompleterWidget {
    return this._completer;
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

    // Clean up and disconnect from old editor.
    if (editor && !editor.isDisposed) {
      let model = editor.model;
      editor.host.classList.remove(COMPLETER_ENABLED_CLASS);
      model.selections.changed.disconnect(this.onSelectionsChanged, this);
      model.value.changed.disconnect(this.onTextChanged, this);
    }

    // Reset completer state.
    if (this._completer) {
      this._completer.reset();
      this._completer.editor = newValue;
    }

    // Update the editor and signal connections.
    editor = this._editor = newValue;
    if (editor) {
      let model = editor.model;
      model.selections.changed.connect(this.onSelectionsChanged, this);
      model.value.changed.connect(this.onTextChanged, this);
      // On initial load, manually check the cursor position.
      this.onSelectionsChanged();
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

    // Use public accessor to disconnect from editor signals.
    this.editor = null;
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
    const editor = this.editor;
    return {
      text: editor.model.value.text,
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
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

      // If a newer completion request has created a pending request, bail.
      if (pending !== this._pending) {
        return;
      }

      this.onReply(request, msg);
    });
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  protected onCompletionSelected(completer: CompleterWidget, value: string): void {
    let model = completer.model;
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

  /**
   * Handle `invoke-request` messages.
   */
  protected onInvokeRequest(msg: Message): void {
    // If there is neither a kernel nor a completer model, bail.
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
   *
   * @param state - The state of the editor when completion request was made.
   *
   * @param reply - The API response returned for a completion request.
   */
  protected onReply(state: CompleterWidget.ITextState, reply: KernelMessage.ICompleteReplyMsg): void {
    const model = this._completer.model;
    if (!model) {
      return;
    }

    // Completion request failures or negative results fail silently.
    const value = reply.content;
    if (value.status !== 'ok') {
      model.reset(true);
      return;
    }

    // Update the original request.
    model.original = state;

    // Update the options.
    model.setOptions(value.matches || []);

    // Update the cursor.
    model.cursor = { start: value.cursor_start, end: value.cursor_end };
  }

  /**
   * Handle selection changed signal from an editor.
   *
   * #### Notes
   * If a sub-class reimplements this method, then that class must either call
   * its super method or it must take responsibility for adding and removing
   * the completer completable class to the editor host node.
   */
  protected onSelectionsChanged(): void {
    const model = this._completer.model;
    if (!model) {
      return;
    }

    const editor = this._editor;
    const host = editor.host;
    const position = editor.getCursorPosition();
    const line = editor.getLine(position.line);

    if (line.match(/^\W*$/)) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }
    this._enabled = true;
    host.classList.add(COMPLETER_ENABLED_CLASS);
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(): void {
    const model = this._completer.model;
    if (!model || !this._enabled) {
      return;
    }

    // If there is a text selection, no completion is allowed.
    const editor = this.editor;
    const { start, end } = editor.getSelection();
    if (start.column !== end.column || start.line !== end.line) {
      return;
    }

    const request = this.getState(editor.getCursorPosition());
    model.handleTextChange(request);
  }

  /**
   * Handle a visiblity change signal from a completer widget.
   */
  protected onVisibilityChanged(completer: CompleterWidget): void {
    // Completer is not active.
    if (completer.isDisposed || completer.isHidden) {
      if (this._editor) {
        this._editor.host.classList.remove(COMPLETER_ACTIVE_CLASS);
        this._editor.focus();
      }
      return;
    }

    // Completer is active.
    if (this._editor) {
      this._editor.host.classList.add(COMPLETER_ACTIVE_CLASS);
    }
  }

  private _editor: CodeEditor.IEditor | null = null;
  private _enabled = false;
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
