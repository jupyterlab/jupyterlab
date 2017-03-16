// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Widget
} from '@phosphor/widgets';

import * as Xterm
  from 'xterm';

/**
 * The class name added to a terminal widget.
 */
const TERMINAL_CLASS = 'jp-TerminalWidget';

/**
 * The class name added to a terminal body.
 */
const TERMINAL_BODY_CLASS = 'jp-TerminalWidget-body';

/**
 * The number of rows to use in the dummy terminal.
 */
const DUMMY_ROWS = 24;

/**
 * The number of cols to use in the dummy terminal.
 */
const DUMMY_COLS = 80;


/**
 * A widget which manages a terminal session.
 */
export
class TerminalWidget extends Widget {
  /**
   * Construct a new terminal widget.
   *
   * @param options - The terminal configuration options.
   */
  constructor(options: TerminalWidget.IOptions = {}) {
    super();
    this.addClass(TERMINAL_CLASS);

    // Create the xterm, dummy terminal, and private style sheet.
    this._term = new Xterm(Private.getConfig(options));
    this._initializeTerm();
    this._dummyTerm = Private.createDummyTerm();
    this._sheet = document.createElement('style');
    this.node.appendChild(this._sheet);

    // Initialize settings.
    let defaults = TerminalWidget.defaultOptions;
    this._fontSize = options.fontSize || defaults.fontSize;
    this._background = options.background || defaults.background;
    this._color = options.color || defaults.color;
    this.id = `jp-TerminalWidget-${Private.id++}`;
    this.title.label = 'Terminal';
  }

  /**
   * The terminal session associated with the widget.
   */
  get session(): TerminalSession.ISession {
    return this._session;
  }
  set session(value: TerminalSession.ISession) {
    if (this._session && !this._session.isDisposed) {
      this._session.messageReceived.disconnect(this._onMessage, this);
    }
    this._session = value || null;
    if (!value) {
      return;
    }
    this._session.ready.then(() => {
      if (this.isDisposed) {
        return;
      }
      this._session.messageReceived.connect(this._onMessage, this);
      this.title.label = `Terminal ${this._session.name}`;
      this._setSessionSize();
    });
  }

  /**
   * Get the font size of the terminal in pixels.
   */
  get fontSize(): number {
    return this._fontSize;
  }

  /**
   * Set the font size of the terminal in pixels.
   */
  set fontSize(size: number) {
    if (this._fontSize === size) {
      return;
    }
    this._fontSize = size;
    this._needsSnap = true;
    this.update();
  }

  /**
   * Get the background color of the terminal.
   */
  get background(): string {
    return this._background;
  }

  /**
   * Set the background color of the terminal.
   */
  set background(value: string) {
    if (this._background === value) {
      return;
    }
    this._background = value;
    this._needsStyle = true;
    this.update();
  }

  /**
   * Get the text color of the terminal.
   */
  get color(): string {
    return this._color;
  }

  /**
   * Set the text color of the terminal.
   */
  set color(value: string) {
    if (this._color === value) {
      return;
    }
    this._color = value;
    this._needsStyle = true;
    this.update();
  }

  /**
   * Dispose of the resources held by the terminal widget.
   */
  dispose(): void {
    this._session = null;
    this._sheet = null;
    this._term = null;
    this._dummyTerm = null;
    this._box = null;
    super.dispose();
  }

  /**
   * Refresh the terminal session.
   */
  refresh(): Promise<void> {
    if (!this._session) {
      return Promise.reject(void 0);
    }
    return this._session.reconnect().then(() => {
      this._term.clear();
    });
  }

  /**
   * Process a message sent to the widget.
   *
   * @param msg - The message sent to the widget.
   *
   * #### Notes
   * Subclasses may reimplement this method as needed.
   */
  processMessage(msg: Message): void {
    super.processMessage(msg);
    switch (msg.type) {
      case 'fit-request':
        this.onFitRequest(msg);
        break;
      default:
        break;
    }
  }

  /**
   * Set the size of the terminal when attached if dirty.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Set the size of the terminal when shown if dirty.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  /**
   * Dispose of the terminal when closing.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
   * On resize, use the computed row and column sizes to resize the terminal.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    this._offsetWidth = msg.width;
    this._offsetHeight = msg.height;
    this._needsResize = true;
    this.update();
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (!this.isVisible) {
      return;
    }
    if (this._needsSnap) {
      this._snapTermSizing();
    }
    if (this._needsResize) {
      this._resizeTerminal();
    }
    if (this._needsStyle) {
      this._setStyle();
    }
  }

  /**
   * A message handler invoked on an `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    let resize = Widget.ResizeMessage.UnknownSize;
    MessageLoop.sendMessage(this, resize);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._term.focus();
  }

  /**
   * Create the terminal object.
   */
  private _initializeTerm(): void {
    this._term.open(this.node);
    this._term.element.classList.add(TERMINAL_BODY_CLASS);

    this._term.on('data', (data: string) => {
      if (this._session) {
        this._session.send({
          type: 'stdin',
          content: [data]
        });
      }
    });

    this._term.on('title', (title: string) => {
        this.title.label = title;
    });
  }

  /**
   * Handle a message from the terminal session.
   */
  private _onMessage(sender: TerminalSession.ISession, msg: TerminalSession.IMessage): void {
    switch (msg.type) {
    case 'stdout':
      this._term.write(msg.content[0] as string);
      break;
    case 'disconnect':
      this._term.write('\r\n\r\n[Finished... Term Session]\r\n');
      break;
    default:
      break;
    }
  }

  /**
   * Use the dummy terminal to measure the row and column sizes.
   */
  private _snapTermSizing(): void {
    this._term.element.style.fontSize = `${this.fontSize}px`;
    let node = this._dummyTerm;
    this._term.element.appendChild(node);
    this._rowHeight = node.offsetHeight / DUMMY_ROWS;
    this._colWidth = node.offsetWidth / DUMMY_COLS;
    this._term.element.removeChild(node);
    this._needsSnap = false;
    this._needsResize = true;
  }

  /**
   * Resize the terminal based on computed geometry.
   */
  private _resizeTerminal() {
    let offsetWidth = this._offsetWidth;
    let offsetHeight = this._offsetHeight;
    if (offsetWidth < 0) {
      offsetWidth = this.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = this.node.offsetHeight;
    }
    let box = this._box || (this._box = ElementExt.boxSizing(this.node));
    let height = offsetHeight - box.verticalSum;
    let width = offsetWidth - box.horizontalSum;
    let rows = Math.floor(height / this._rowHeight) - 1;
    let cols = Math.floor(width / this._colWidth) - 1;
    this._term.resize(cols, rows);
    this._sessionSize = [rows, cols, height, width];
    this._setSessionSize();
    this._needsResize = false;
  }

  /**
   * Send the size to the session.
   */
  private _setSessionSize(): void {
    if (this._session) {
      this._session.send({
        type: 'set_size',
        content: this._sessionSize
      });
    }
  }

  /**
   * Set the stylesheet.
   */
  private _setStyle(): void {
    // Set the fg and bg colors of the terminal and cursor.
    this._sheet.innerHTML = (`
      #${this.node.id} {
        background: ${this._background};
        color: ${this._color};
      }
      #${this.node.id} .xterm-viewport, #${this.node.id} .xterm-rows {
        background-color: ${this._background};
        color: ${this._color};
      }
      #${this.node.id} .terminal.focus .terminal-cursor.blinking {
          animation: ${this.node.id}-blink-cursor 1.2s infinite step-end;
      }
      @keyframes ${this.node.id}-blink-cursor {
          0% {
              background-color: ${this._color};
              color: ${this._background};
          }
          50% {
              background-color: transparent;
              color: ${this._color};
          }
      }
    `);
    this._needsStyle = false;
  }

  private _term: Xterm = null;
  private _sheet: HTMLElement = null;
  private _dummyTerm: HTMLElement = null;
  private _fontSize = -1;
  private _needsSnap = true;
  private _needsResize = true;
  private _needsStyle = true;
  private _rowHeight = -1;
  private _colWidth = -1;
  private _offsetWidth = -1;
  private _offsetHeight = -1;
  private _sessionSize: [number, number, number, number] = [1, 1, 1, 1];
  private _background = '';
  private _color = '';
  private _box: ElementExt.IBoxSizing = null;
  private _session: TerminalSession.ISession = null;
}


/**
 * The namespace for `TerminalWidget` class statics.
 */
export
namespace TerminalWidget {
  /**
   * Options for the terminal widget.
   */
  export
  interface IOptions {
    /**
     * The font size of the terminal in pixels.
     */
    fontSize?: number;

    /**
     * The background color of the terminal.
     */
    background?: string;

    /**
     * The text color of the terminal.
     */
    color?: string;

    /**
     * Whether to blink the cursor.  Can only be set at startup.
     */
    cursorBlink?: boolean;
  }

  /**
   * The default options used for creating terminals.
   */
  export
  const defaultOptions: IOptions = {
    background: 'black',
    color: 'white',
    fontSize: 13,
    cursorBlink: true
  };
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get term.js options from ITerminalOptions.
   */
  export
  function getConfig(options: TerminalWidget.IOptions): Xterm.IOptions {
    let config: Xterm.IOptions = {};
    if (options.cursorBlink !== void 0) {
      config.cursorBlink = options.cursorBlink;
    } else {
      config.cursorBlink = TerminalWidget.defaultOptions.cursorBlink;
    }
    return config;
  }

  /**
   * Create a dummy terminal element used to measure text size.
   */
  export
  function createDummyTerm(): HTMLElement {
    let node = document.createElement('div');
    let rowspan = document.createElement('span');
    rowspan.innerHTML = Array(DUMMY_ROWS).join('a<br>');
    let colspan = document.createElement('span');
    colspan.textContent = Array(DUMMY_COLS + 1).join('a');
    node.appendChild(rowspan);
    node.appendChild(colspan);
    node.style.visibility = 'hidden';
    node.style.position = 'absolute';
    node.style.height = 'auto';
    node.style.width = 'auto';
    (node.style as any)['white-space'] = 'nowrap';
    return node;
  }

  /**
   * An incrementing counter for ids.
   */
  export
  let id = 0;
}
