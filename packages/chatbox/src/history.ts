// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Signal
} from '@phosphor/signaling';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';


/**
 * The definition of a chatbox history manager object.
 */
export
interface IChatboxHistory extends IDisposable {
  /**
   * The current editor used by the history widget.
   */
  editor: CodeEditor.IEditor;

  /**
   * The placeholder text that a history session began with.
   */
  readonly placeholder: string;

  /**
   * Get the previous item in the chatbox history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for chatbox command text or `undefined` if unavailable.
   */
  back(placeholder: string): Promise<string>;

  /**
   * Get the next item in the chatbox history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for chatbox command text or `undefined` if unavailable.
   */
  forward(placeholder: string): Promise<string>;

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the chatbox's history will consist of no contiguous repetitions.
   */
  push(item: string): void;

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void;
}


/**
 * A chatbox history manager object.
 */
export
class ChatboxHistory implements IChatboxHistory {
  /**
   * The current editor used by the history manager.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor;
  }
  set editor(value: CodeEditor.IEditor) {
    if (this._editor === value) {
      return;
    }

    let editor = this._editor;
    if (editor) {
      editor.edgeRequested.disconnect(this.onEdgeRequest, this);
      editor.model.value.changed.disconnect(this.onTextChange, this);
    }

    editor = this._editor = value;
    editor.edgeRequested.connect(this.onEdgeRequest, this);
    editor.model.value.changed.connect(this.onTextChange, this);
  }

  /**
   * The placeholder text that a history session began with.
   */
  get placeholder(): string {
    return this._placeholder;
  }

  /**
   * Get whether the chatbox history manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the chatbox history manager.
   */
  dispose(): void {
    this._isDisposed = true;
    this._history.length = 0;
    Signal.clearData(this);
  }

  /**
   * Get the previous item in the chatbox history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for chatbox command text or `undefined` if unavailable.
   */
  back(placeholder: string): Promise<string> {
    if (!this._hasSession) {
      this._hasSession = true;
      this._placeholder = placeholder;
    }

    let content = this._history[--this._cursor];
    this._cursor = Math.max(0, this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Get the next item in the chatbox history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for chatbox command text or `undefined` if unavailable.
   */
  forward(placeholder: string): Promise<string> {
    if (!this._hasSession) {
      this._hasSession = true;
      this._placeholder = placeholder;
    }

    let content = this._history[++this._cursor];
    this._cursor = Math.min(this._history.length, this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the chatbox's history will consist of no contiguous repetitions.
   */
  push(item: string): void {
    if (item && item !== this._history[this._history.length - 1]) {
      this._history.push(item);
    }
    this.reset();
  }

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void {
    this._cursor = this._history.length;
    this._hasSession = false;
    this._placeholder = '';
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
   * Handle an edge requested signal.
   */
  protected onEdgeRequest(editor: CodeEditor.IEditor, location: CodeEditor.EdgeLocation): void {
    let model = this._editor.model;
    let source = model.value.text;

    if (location === 'top') {
      this.back(source).then(value => {
        if (this.isDisposed || !value) {
          return;
        }
        if (model.value.text === value) {
          return;
        }
        this._setByHistory = true;
        model.value.text = value;
        editor.setCursorPosition({ line: 0, column: 0 });
      });
    } else {
      this.forward(source).then(value => {
        if (this.isDisposed) {
          return;
        }
        let text = value || this.placeholder;
        if (model.value.text === text) {
          return;
        }
        this._setByHistory = true;
        model.value.text = text;
        editor.setCursorPosition(editor.getPositionAt(text.length));
      });
    }
  }

  private _cursor = 0;
  private _hasSession = false;
  private _history: string[] = [];
  private _placeholder: string = '';
  private _setByHistory = false;
  private _isDisposed = false;
  private _editor: CodeEditor.IEditor = null;
}
