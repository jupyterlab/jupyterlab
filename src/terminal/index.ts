// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ITerminalSession, TerminalSession
} from 'jupyter-js-services';

import {
  Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  boxSizing, IBoxSizing
} from 'phosphor/lib/dom/sizing';

import {
  ResizeMessage, Widget
} from 'phosphor/lib/ui/widget';

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
    this.fontSize = options.fontSize || 14;
    this.background = options.background || 'black';
    this.color = options.color || 'white';
    this.id = `jp-TerminalWidget-${Private.id++}`;
    this.title.label = 'Terminal';
    (Xterm as any).brokenBold = true;
  }

  /**
   * The terminal session associated with the widget.
   */
  get session(): ITerminalSession {
    return this._session;
  }
  set session(value: ITerminalSession) {
    if (this._session && !this._session.isDisposed) {
      this._session.messageReceived.disconnect(this._onMessage, this);
    }
    this._session = value;
    this._session.messageReceived.connect(this._onMessage, this);
    this.title.label = `Terminal ${this._session.name}`;
    this._resizeTerminal(-1, -1);
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
    this._fontSize = size;
    this._term.element.style.fontSize = `${size}px`;
    this._snapTermSizing();
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
    this._background = value;
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
    this._color = value;
    this.update();
  }

  /**
   * Get whether the bell is shown.
   */
  get visualBell(): boolean {
    return this._term.visualBell;
  }

  /**
   * Set whether the bell is shown.
   */
  set visualBell(value: boolean) {
    this._term.visualBell = value;
  }

  /**
   * Get whether to focus on a bell event.
   */
  get popOnBell(): boolean {
    return this._term.popOnBell;
  }

  /**
   * Set whether to focus on a bell event.
   */
  set popOnBell(value: boolean) {
    this._term.popOnBell = value;
  }

  /**
   * Get the size of the scrollback buffer in the terminal.
   */
  get scrollback(): number {
    return this._term.scrollback;
  }

  /**
   * Set the size of the scrollback buffer in the terminal.
   */
  set scrollback(value: number) {
    this._term.scrollback = value;
  }

  /**
   * Dispose of the resources held by the terminal widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._session = null;
    this._sheet = null;
    this._term = null;
    this._dummyTerm = null;
    this._box = null;
    super.dispose();
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
    if (this._dirty) {
      this._snapTermSizing();
    }
  }

  /**
   * Set the size of the terminal when shown if dirty.
   */
  protected onAfterShow(msg: Message): void {
    if (this._dirty) {
      this._snapTermSizing();
    }
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
  protected onResize(msg: ResizeMessage): void {
    this._resizeTerminal(msg.width, msg.height);
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    // Set the fg and bg colors of the terminal and cursor.
    const style = (`
      #${this.node.id} {
        background: ${this.background};
        color: ${this.color};
      }
      #${this.node.id} .xterm-viewport, #${this.node.id} .xterm-rows {
        background-color: ${this.background};
        color: ${this.color};
      }
      #${this.node.id} .terminal.focus .terminal-cursor.blinking {
          animation: ${this.node.id}-blink-cursor 1.2s infinite step-end;
      }
      @keyframes ${this.node.id}-blink-cursor {
          0% {
              background-color: ${this.color};
              color: ${this.background};
          }
          50% {
              background-color: transparent;
              color: ${this.color};
          }
      }
    `);
    this._sheet.innerHTML = style;
  }

  /**
   * A message handler invoked on an `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    let resize = ResizeMessage.UnknownSize;
    sendMessage(this, resize);
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
  private _onMessage(sender: ITerminalSession, msg: TerminalSession.IMessage): void {
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
    if (!this.isVisible) {
      this._dirty = true;
      return;
    }
    let node = this._dummyTerm;
    this._term.element.appendChild(node);
    this._rowHeight = node.offsetHeight / DUMMY_ROWS;
    this._colWidth = node.offsetWidth / DUMMY_COLS;
    this._term.element.removeChild(node);
    this._resizeTerminal(-1, -1);
  }

  /**
   * Resize the terminal based on the computed geometry.
   *
   * The parent offset dimensions should be `-1` if unknown.
   */
  private _resizeTerminal(offsetWidth: number, offsetHeight: number) {
    if (this._rowHeight === -1 || !this.isVisible || !this._session) {
      this._dirty = true;
      return;
    }
    if (offsetWidth < 0) {
      offsetWidth = this.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = this.node.offsetHeight;
    }
    let box = this._box || (this._box = boxSizing(this.node));
    let height = offsetHeight - box.verticalSum;
    let width = offsetWidth - box.horizontalSum;
    let rows = Math.floor(height / this._rowHeight) - 1;
    let cols = Math.floor(width / this._colWidth) - 1;
    this._term.resize(cols, rows);
    this._session.send({
      type: 'set_size',
      content: [rows, cols, height, width]
    });
    this._dirty = false;
    this.update();
  }

  private _term: Xterm = null;
  private _sheet: HTMLElement = null;
  private _dummyTerm: HTMLElement = null;
  private _fontSize = -1;
  private _dirty = false;
  private _rowHeight = -1;
  private _colWidth = -1;
  private _background = '';
  private _color = '';
  private _box: IBoxSizing = null;
  private _session: ITerminalSession = null;
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

    /**
     * Whether to show a bell in the terminal.
     */
    visualBell?: boolean;

    /**
     * Whether to focus on a bell event.
     */
    popOnBell?: boolean;

    /**
     * The size of the scrollback buffer in the terminal.
     */
    scrollback?: number;
  }
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
      config.cursorBlink = true;
    }
    if (options.visualBell !== void 0) {
      config.visualBell = options.visualBell;
    }
    if (options.popOnBell !== void 0) {
      config.popOnBell = options.popOnBell;
    }
    if (options.scrollback !== void 0) {
      config.scrollback = options.scrollback;
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
