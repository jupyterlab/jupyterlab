// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget, ResizeMessage
} from 'phosphor/lib/ui/widget';

import {
  AbstractCodeEditor, CodeEditorProvider
} from './editor';

/**
 * A widget which hosts a code editor.
 */
export
class CodeEditorWidget<E extends AbstractCodeEditor> extends Widget {

  constructor(editorProvider:CodeEditorProvider<E>) {
    super();
    this._editor = editorProvider(this);
  }

  /**
   * Get the editor wrapped by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
   get editor(): E {
    return this.editor;
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
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.editor.refresh();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    this.editor.refresh();
  }

  /**
   * A message handler invoked on an `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    this.editor.setSize(msg);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._editor.focus();
  }
  
  private _editor:AbstractCodeEditor = null;

}
