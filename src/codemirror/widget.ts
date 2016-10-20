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
 * The class name added to a live codemirror widget.
 */
const LIVE_CLASS = 'jp-CodeMirrorWidget-live';

/**
 * The class name added to a static codemirror widget.
 */
const STATIC_CLASS = 'jp-CodeMirrorWidget-static';

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
    this._live = new LiveCodeMirror(options);
    this._static = new StaticCodeMirror(this._live.editor);
    layout.addWidget(this._static);
    layout.addWidget(this._live);
    this._live.hide();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._static.dispose();
    this._live.dispose();
    super.dispose();
  }

  /**
   * Get the editor wrapped by the widget.
   */
  get editor(): CodeMirror.Editor {
    return this._live.editor;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._static.hide();
    this._live.show();
    this.editor.focus();
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
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('focus', this, true);
    this.node.removeEventListener('blur', this, true);
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: MouseEvent): void {
    if (this.editor.getOption('readOnly') !== false) {
      return;
    }
    this._static.hide();
    this._live.show();
  }

  /**
   * Handle `blur` events for the widget.
   */
  private _evtBlur(event: MouseEvent): void {
    if (this.node.contains(event.relatedTarget as HTMLElement)) {
      return;
    }
    this._live.hide();
    this._static.show();
  }

  private _live: LiveCodeMirror;
  private _static: StaticCodeMirror;
}


/**
 * A widget that hosts a codemirror instance.
 */
class LiveCodeMirror extends Widget {
  /**
   * Construct a live codemirror.
   */
  constructor(options: CodeMirror.EditorConfiguration) {
    super();
    this.addClass(LIVE_CLASS);
    this._editor = CodeMirror(this.node, options);
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
   */
  get editor(): CodeMirror.Editor {
     return this._editor;
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    if (!this.isVisible) {
      this._needsRefresh = true;
      return;
    }
    this._editor.refresh();
    this._needsRefresh = false;
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsRefresh) {
      this._editor.refresh();
      this._needsRefresh = false;
    }
    this._editor.refresh();
    this._editor.focus();
  }

  /**
   * A message handler invoked on a `'before-hide'` message.
   */
  protected onBeforeHide(msg: Message): void {
    this._needsRefresh = true;
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

  private _needsRefresh = true;
  private _editor: CodeMirror.Editor = null;
}


/**
 * A widget that holds rendered codemirror text.
 */
class StaticCodeMirror extends Widget {
  /**
   * Construct a new static code mirror widget.
   */
  constructor(editor: CodeMirror.Editor) {
    super({ node: document.createElement('pre') });
    this._editor = editor;
    this.addClass(`cm-s-${editor.getOption('theme')}`);
    this.addClass('CodeMirror');
    this.addClass(STATIC_CLASS);
    CodeMirror.on(this._editor.getDoc(), 'change', (instance, change) => {
      if (this.isVisible) {
        this._render();
      } else {
        this._needsRefresh = true;
      }
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._editor = null;
    super.dispose();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    if (!this.isVisible) {
      this._needsRefresh = true;
      return;
    }
    this._render();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsRefresh) {
      this._render();
    }
  }

  /**
   * Render the static content.
   */
  private _render(): void {
    CodeMirror.runMode(this._editor.getDoc().getValue(),
                       this._editor.getOption('mode'),
                       this.node);
    this._needsRefresh = false;
  }

  private _editor: CodeMirror.Editor = null;
  private _needsRefresh = true;
}
