// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ResizeMessage, Widget
} from 'phosphor/lib/ui/widget';


/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/**
 * The name of the default CodeMirror theme
 */
export
const DEFAULT_CODEMIRROR_THEME = 'jupyter';


/**
 * A widget which hosts a CodeMirror editor.
 */
export
class CodeMirrorWidget extends Widget {

  /**
   * Construct a CodeMirror widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super();
    this.addClass(EDITOR_CLASS);
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    this._editor = CodeMirror(this.node, options);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    clearTimeout(this._resizing);
    this._editor = null;
    super.dispose();
  }

  /**
   * Get the editor wrapped by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
   get editor(): CodeMirror.Editor {
     return this._editor;
   }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'focus':
      this._evtFocus(event as FocusEvent);
      break;
    default:
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('focus', this, true);
    if (!this.isVisible) {
      this._needsRefresh = true;
      return;
    }
    this._editor.refresh();
    this._needsRefresh = false;
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('focus', this, true);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsRefresh) {
      this._editor.refresh();
      this._needsRefresh = false;
    }
  }

  /**
   * A message handler invoked on an `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (msg.width < 0 || msg.height < 0) {
      if (this._resizing === -1) {
        this._resizing = setTimeout(() => {
          this._editor.setSize(null, null);
          this._resizing = -1;
        }, 500);
      }
    } else {
      this._editor.setSize(msg.width, msg.height);
    }
    this._needsRefresh = true;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._editor.focus();
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: FocusEvent): void {
    if (this._needsRefresh) {
      this._editor.refresh();
      this._needsRefresh = false;
    }
  }

  private _editor: CodeMirror.Editor = null;
  private _needsRefresh = true;
  private _resizing = -1;
}
