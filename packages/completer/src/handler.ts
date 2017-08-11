// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Signal
} from '@phosphor/signaling';

import {
  Text
} from '@jupyterlab/coreutils';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  Completer
} from './widget';


/**
 * A class added to editors that can host a completer.
 */
const COMPLETER_ENABLED_CLASS: string = 'jp-mod-completer-enabled';

/**
 * A class added to editors that have an active completer.
 */
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
    this.completer = options.completer;
    this.completer.selected.connect(this.onCompletionSelected, this);
    this.completer.visibilityChanged.connect(this.onVisibilityChanged, this);
    this.session = options.session;
  }

  /**
   * The completer widget managed by the handler.
   */
  readonly completer: Completer;

  /**
   * The editor used by the completion handler.
   */
  get editor(): CodeEditor.IEditor | null {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null) {
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
    this.completer.reset();
    this.completer.editor = newValue;

    // Update the editor and signal connections.
    editor = this._editor = newValue;
    if (editor) {
      const model = editor.model;
      this._enabled = false;
      model.selections.changed.connect(this.onSelectionsChanged, this);
      model.value.changed.connect(this.onTextChanged, this);
      // On initial load, manually check the cursor position.
      this.onSelectionsChanged();
    }
  }

  /**
   * The session used by the completion handler.
   */
  readonly session: IClientSession;

  /**
   * Get whether the completion handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
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
  protected getState(editor: CodeEditor.IEditor, position: CodeEditor.IPosition): Completer.ITextState {
    return {
      text: editor.model.value.text,
      lineHeight: editor.lineHeight,
      charWidth: editor.charWidth,
      line: position.line,
      column: position.column
    };
  }

  /**
   * Make a complete request using the session.
   */
  protected makeRequest(position: CodeEditor.IPosition): Promise<void> {
    if (!this.session.kernel) {
      return Promise.reject(new Error('no kernel for completion request'));
    }

    let editor = this.editor;
    if (!editor) {
      return Promise.reject(new Error('No active editor'));
    }

    const code = editor.model.value.text;
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), code);
    let content: KernelMessage.ICompleteRequest = {
      code: editor.model.value.text,
      cursor_pos: offset
    };
    let pending = ++this._pending;
    let request = this.getState(editor, position);

    return this.session.kernel.requestComplete(content).then(msg => {
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
  protected onCompletionSelected(completer: Completer, value: string): void {
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
    if (position) {
      editor.setCursorPosition(position);
    }
  }

  /**
   * Handle `invoke-request` messages.
   */
  protected onInvokeRequest(msg: Message): void {
    // If there is neither a kernel nor a completer model, bail.
    if (!this.session.kernel || !this.completer.model) {
      return;
    }

    // If a completer session is already active, bail.
    if (this.completer.model.original) {
      return;
    }

    let editor = this._editor;
    if (editor) {
      this.makeRequest(editor.getCursorPosition());
    }
  }

  /**
   * Receive a completion reply from the kernel.
   *
   * @param state - The state of the editor when completion request was made.
   *
   * @param reply - The API response returned for a completion request.
   */
  protected onReply(state: Completer.ITextState, reply: KernelMessage.ICompleteReplyMsg): void {
    const model = this.completer.model;
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
    const text = state.text;
    model.cursor = {
      start: Text.charIndexToJsIndex(value.cursor_start, text),
      end: Text.charIndexToJsIndex(value.cursor_end, text),
    };
  }

  /**
   * Handle selection changed signal from an editor.
   *
   * #### Notes
   * If a sub-class reimplements this method, then that class must either call
   * its super method or it must take responsibility for adding and removing
   * the completer completable class to the editor host node.
   *
   * Despite the fact that the editor widget adds a class whenever there is a
   * primary selection, this method checks indepenently for two reasons:
   *
   * 1. The editor widget connects to the same signal to add that class, so
   *    there is no guarantee that the class will be added before this method
   *    is invoked so simply checking for the CSS class's existence is not an
   *    option. Secondarily, checking the editor state should be faster than
   *    querying the DOM in either case.
   * 2. Because this method adds a class that indicates whether completer
   *    functionality ought to be enabled, relying on the behavior of the
   *    `jp-mod-has-primary-selection` to filter out any editors that have
   *    a selection means the semantic meaning of `jp-mod-completer-enabled`
   *    is obscured because there may be cases where the enabled class is added
   *    even though the completer is not available.
   */
  protected onSelectionsChanged(): void {
    const model = this.completer.model;
    const editor = this._editor;

    if (!model || !editor) {
      return;
    }

    const host = editor.host;

    // If there is no model, return.
    if (!model) {
      this._enabled = false;
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    const position = editor.getCursorPosition();
    const line = editor.getLine(position.line);
    if (!line) {
      return;
    }

    const { start, end } = editor.getSelection();

    // If there is a text selection, return.
    if (start.column !== end.column || start.line !== end.line) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // If the entire line is white space, return.
    if (line.match(/^\W*$/)) {
      this._enabled = false;
      model.reset(true);
      host.classList.remove(COMPLETER_ENABLED_CLASS);
      return;
    }

    // Enable completion.
    if (!this._enabled) {
      this._enabled = true;
      host.classList.add(COMPLETER_ENABLED_CLASS);
    }

    // Dispatch the cursor change.
    model.handleCursorChange(this.getState(editor, editor.getCursorPosition()));
  }

  /**
   * Handle a text changed signal from an editor.
   */
  protected onTextChanged(): void {
    const model = this.completer.model;
    if (!model || !this._enabled) {
      return;
    }

    // If there is a text selection, no completion is allowed.
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const { start, end } = editor.getSelection();
    if (start.column !== end.column || start.line !== end.line) {
      return;
    }

    // Dispatch the text change.
    model.handleTextChange(this.getState(editor, editor.getCursorPosition()));
  }

  /**
   * Handle a visiblity change signal from a completer widget.
   */
  protected onVisibilityChanged(completer: Completer): void {
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
  private _pending = 0;
  private _isDisposed = false;
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
    completer: Completer;

    /**
     * The session for the completion handler.
     */
    session: IClientSession;
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
