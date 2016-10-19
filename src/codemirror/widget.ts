// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';
import 'codemirror/addon/runmode/runmode';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

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
    let layout = this.layout = new PanelLayout();
    this.node.tabIndex = -1;
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    this._rendered = new Widget();
    this._rendered.addClass(`cm-s-${options.theme}`);
    this._rendered.addClass('CodeMirror');
    this._live = new Widget();
    layout.addWidget(this._rendered);
    layout.addWidget(this._live);
    this._rendered.hide();
    this._editor = CodeMirror(this._live.node, options);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
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
      this._evtFocus(event as MouseEvent);
      break;
    case 'blur':
      this._evtBlur(event as MouseEvent);
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
    this.node.addEventListener('blur', this, true);
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
    this.node.removeEventListener('blur', this, true);
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
      this._editor.refresh();
    } else {
      this._editor.setSize(msg.width, msg.height);
    }
    this._needsRefresh = false;
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
  private _evtFocus(event: MouseEvent): void {
    this._rendered.hide();
    this._live.show();
    this._editor.focus();
  }

  /**
   * Handle `blur` events for the widget.
   */
  private _evtBlur(event: MouseEvent): void {
    if (this.node.contains(event.relatedTarget as HTMLElement)) {
      return;
    }
    this._live.hide();
    this._rendered.show();
    CodeMirror.runMode(this._editor.getDoc().getValue(),
                       this._editor.getOption('mode'),
                       this._rendered.node);
  }

  private _editor: CodeMirror.Editor = null;
  private _live: Widget;
  private _rendered: Widget;
  private _needsRefresh = true;
}
