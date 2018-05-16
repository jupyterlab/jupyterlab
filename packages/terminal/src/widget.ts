// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import * as Xterm
  from 'xterm';

/**
 * The class name added to a terminal widget.
 */
const TERMINAL_CLASS = 'jp-Terminal';

/**
 * The class name added to a terminal body.
 */
const TERMINAL_BODY_CLASS = 'jp-Terminal-body';

/**
 * The class name add to the terminal widget when it has the dark theme.
 */
const TERMINAL_DARK_THEME = 'jp-Terminal-dark';

/**
 * The class name add to the terminal widget when it has the light theme.
 */
const TERMINAL_LIGHT_THEME = 'jp-Terminal-light';


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
class Terminal extends Widget {
  /**
   * Construct a new terminal widget.
   *
   * @param options - The terminal configuration options.
   */
  constructor(options: Partial<Terminal.IOptions> = {}) {
    super();
    this.addClass(TERMINAL_CLASS);

    // Create the xterm, dummy terminal, and private style sheet.
    this._term = new Xterm(Private.getConfig(options));
    this._initializeTerm();
    this._dummyTerm = Private.createDummyTerm();

    // Initialize settings.
    let defaults = Terminal.defaultOptions;
    this._fontSize = options.fontSize || defaults.fontSize;
    this._initialCommand = options.initialCommand || defaults.initialCommand;
    this.theme = options.theme || defaults.theme;
    this.id = `jp-Terminal-${Private.id++}`;
    this.title.label = 'Terminal';
  }

  /**
   * The terminal session associated with the widget.
   */
  get session(): TerminalSession.ISession | null {
    return this._session;
  }
  set session(value: TerminalSession.ISession | null) {
    if (this._session && !this._session.isDisposed) {
      this._session.messageReceived.disconnect(this._onMessage, this);
    }
    this._session = value || null;
    if (!value) {
      return;
    }
    value.ready.then(() => {
      if (this.isDisposed || value !== this._session) {
        return;
      }
      value.messageReceived.connect(this._onMessage, this);
      this.title.label = `Terminal ${value.name}`;
      this._setSessionSize();
      if (this._initialCommand) {
        this._session.send({
          type: 'stdin',
          content: [this._initialCommand + '\r']
        });
      }
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
    this._needsResize = true;
    this.update();
  }

  /**
   * Get the current theme, either light or dark.
   */
  get theme(): Terminal.Theme {
    return this._theme;
  }

  /**
   * Set the current theme, either light or dark.
   */
  set theme(value: Terminal.Theme) {
    this._theme = value;
    this.toggleClass(TERMINAL_LIGHT_THEME, value === 'light');
    this.toggleClass(TERMINAL_DARK_THEME, value === 'dark');
  }

  /**
   * Dispose of the resources held by the terminal widget.
   */
  dispose(): void {
    this._session = null;
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

    if (this._needsResize) {
      this._snapTermSizing();
      this._resizeTerminal();
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
    this._term.open(this.node, false);
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
      if (msg.content) {
        this._term.write(msg.content[0] as string);
      }
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
    const node = this._dummyTerm;

    this._term.element.style.fontSize = `${this.fontSize}px`;
    this._term.element.appendChild(node);
    this._rowHeight = node.offsetHeight / DUMMY_ROWS;
    this._colWidth = node.offsetWidth / DUMMY_COLS;
    this._term.element.removeChild(node);
  }

  /**
   * Resize the terminal based on computed geometry.
   */
  private _resizeTerminal() {
    const { node } = this;
    const offsetWidth = this._offsetWidth < 0 ? node.offsetWidth
      : this._offsetWidth;
    const offsetHeight = this._offsetHeight < 0 ? node.offsetHeight
      : this._offsetHeight;
    const box = this._box = ElementExt.boxSizing(this.node);
    const height = offsetHeight - box.verticalSum;
    const width = offsetWidth - box.horizontalSum;
    const rows = Math.floor(height / this._rowHeight) - 1;
    const cols = Math.floor(width / this._colWidth) - 1;

    this._term.resize(cols, rows);
    this._sessionSize = [rows, cols, height, width];
    this._setSessionSize();
    this._needsResize = false;
  }

  /**
   * Send the size to the session.
   */
  private _setSessionSize(): void {
    const session = this._session;

    if (session) {
      session.send({ type: 'set_size', content: this._sessionSize });
    }
  }

  private _term: Xterm;
  private _dummyTerm: HTMLElement;
  private _fontSize = -1;
  private _needsResize = true;
  private _rowHeight = -1;
  private _colWidth = -1;
  private _offsetWidth = -1;
  private _offsetHeight = -1;
  private _sessionSize: [number, number, number, number] = [1, 1, 1, 1];
  private _theme: Terminal.Theme = 'dark';
  private _box: ElementExt.IBoxSizing | null = null;
  private _session: TerminalSession.ISession | null = null;
  private _initialCommand: string;
}


/**
 * The namespace for `Terminal` class statics.
 */
export
namespace Terminal {
  /**
   * Options for the terminal widget.
   */
  export
  interface IOptions {
    /**
     * The font size of the terminal in pixels.
     */
    fontSize: number;

    /**
     * The theme of the terminal.
     */
    theme: Theme;

    /**
     * Whether to blink the cursor.  Can only be set at startup.
     */
    cursorBlink: boolean;

    /**
     * An optional command to run when the session starts.
     */
    initialCommand: string;
  }

  /**
   * The default options used for creating terminals.
   */
  export
  const defaultOptions: IOptions = {
    theme: 'dark',
    fontSize: 13,
    cursorBlink: true,
    initialCommand: ''
  };

  /**
   * A type for the terminal theme.
   */
  export
  type Theme = 'light' | 'dark';
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get term.js options from ITerminalOptions.
   */
  export
  function getConfig(options: Partial<Terminal.IOptions>): Xterm.IOptions {
    let config: Xterm.IOptions = {};
    if (options.cursorBlink !== void 0) {
      config.cursorBlink = options.cursorBlink;
    } else {
      config.cursorBlink = Terminal.defaultOptions.cursorBlink;
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
