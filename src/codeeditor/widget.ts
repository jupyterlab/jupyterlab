// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  CodeEditor
} from './';

/**
 * A widget which hosts a code editor.
 */
export
class CodeEditorWidget extends Panel {

  constructor(editor: CodeEditor.IEditor) {
    super();
    this._editor = editor;
    this.addWidget(editor);
  }

  /**
   * Get the editor wrapped by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
   get editor(): CodeEditor.IEditor {
    return this._editor;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this._editor.dispose();
    this._editor = null;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._editor.focus();
  }

  private _editor: CodeEditor.IEditor = null;

}
