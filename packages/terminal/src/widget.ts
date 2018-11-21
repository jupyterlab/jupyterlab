// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TerminalSession } from '@jupyterlab/services';

import { Message, MessageLoop } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { Terminal as Xterm } from 'xterm';

import { fit } from 'xterm/lib/addons/fit';

/**
 * The class name added to a terminal widget.
 */
const TERMINAL_CLASS = 'jp-Terminal';

/**
 * The class name added to a terminal body.
 */
const TERMINAL_BODY_CLASS = 'jp-Terminal-body';

/**
 * A widget which manages a terminal session.
 */
export class Terminal extends Widget {
  /**
   * Construct a new terminal widget.
   *
   * @param options - The terminal configuration options.
   */
  constructor(options: Partial<Terminal.IOptions> = {}) {
    super();

    // Initialize settings.
    this._options = { ...Terminal.defaultOptions, ...options };

    const { initialCommand, theme, ...other } = this._options;
    const { lightTheme, darkTheme } = Private;
    const xtermTheme = theme === 'light' ? lightTheme : darkTheme;
    const xtermOptions = { theme: xtermTheme, ...other };

    this.addClass(TERMINAL_CLASS);
    if (theme === 'light') {
      this.addClass('jp-mod-light');
    }

    // Create the xterm.
    this._term = new Xterm(xtermOptions);
    this._initializeTerm();

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
      value.messageReceived.connect(
        this._onMessage,
        this
      );
      this.title.label = `Terminal ${value.name}`;
      this._setSessionSize();
      if (this._options.initialCommand) {
        this._session.send({
          type: 'stdin',
          content: [this._options.initialCommand + '\r']
        });
      }
    });
  }

  /**
   * Set a config option for the terminal.
   */
  getOption<K extends keyof Terminal.IOptions>(
    option: K
  ): Terminal.IOptions[K] {
    return this._options[option];
  }

  /**
   * Set a config option for the terminal.
   */
  setOption<K extends keyof Terminal.IOptions>(
    option: K,
    value: Terminal.IOptions[K]
  ): void {
    if (this._options[option] === value) {
      return;
    }

    this._options[option] = value;

    if (option === 'initialCommand') {
      return;
    }

    if (option === 'theme') {
      if (value === 'light') {
        this.addClass('jp-mod-light');
        this._term.setOption('theme', Private.lightTheme);
      } else {
        this.removeClass('jp-mod-light');
        this._term.setOption('theme', Private.darkTheme);
      }
    } else {
      this._term.setOption(option, value);
      this._needsResize = true;
    }

    this.update();
  }

  /**
   * Dispose of the resources held by the terminal widget.
   */
  dispose(): void {
    this._session = null;
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
    if (!this.isVisible || !this.isAttached) {
      return;
    }

    // Open the terminal if necessary.
    if (!this._termOpened) {
      this._term.open(this.node);
      this._term.element.classList.add(TERMINAL_BODY_CLASS);
      this._termOpened = true;
    }

    if (this._needsResize) {
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
   * Initialize the terminal object.
   */
  private _initializeTerm(): void {
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
  private _onMessage(
    sender: TerminalSession.ISession,
    msg: TerminalSession.IMessage
  ): void {
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
   * Resize the terminal based on computed geometry.
   */
  private _resizeTerminal() {
    fit(this._term);
    if (this._offsetWidth === -1) {
      this._offsetWidth = this.node.offsetWidth;
    }
    if (this._offsetHeight === -1) {
      this._offsetHeight = this.node.offsetHeight;
    }
    this._setSessionSize();
    this._needsResize = false;
  }

  /**
   * Set the size of the terminal in the session.
   */
  private _setSessionSize(): void {
    let content = [
      this._term.rows,
      this._term.cols,
      this._offsetHeight,
      this._offsetWidth
    ];
    if (this._session) {
      this._session.send({ type: 'set_size', content });
    }
  }

  private _term: Xterm;
  private _needsResize = true;
  private _session: TerminalSession.ISession | null = null;
  private _termOpened = false;
  private _offsetWidth = -1;
  private _offsetHeight = -1;
  private _options: Terminal.IOptions;
}

/**
 * The namespace for `Terminal` class statics.
 */
export namespace Terminal {
  /**
   * Options for the terminal widget.
   */
  export interface IOptions {
    /**
     * The font family used to render text.
     */
    fontFamily: string | null;

    /**
     * The font size of the terminal in pixels.
     */
    fontSize: number;

    /**
     * The line height used to render text.
     */
    lineHeight: number | null;

    /**
     * The theme of the terminal.
     */
    theme: Theme;

    /**
     * The amount of buffer scrollback to be used
     * with the terminal
     */
    scrollback: number | null;

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
  export const defaultOptions: IOptions = {
    theme: 'dark',
    fontFamily: 'courier-new, courier, monospace',
    fontSize: 13,
    lineHeight: 1.0,
    scrollback: 1000,
    cursorBlink: true,
    initialCommand: ''
  };

  /**
   * A type for the terminal theme.
   */
  export type Theme = 'light' | 'dark';
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An incrementing counter for ids.
   */
  export let id = 0;

  /**
   * The light terminal theme.
   */
  export const lightTheme = {
    foreground: '#000',
    background: '#fff',
    cursor: '#616161', // md-grey-700
    cursorAccent: '#F5F5F5', // md-grey-100
    selection: 'rgba(97, 97, 97, 0.3)' // md-grey-700
  };

  /**
   * The dark terminal theme.
   */
  export const darkTheme = {
    foreground: '#fff',
    background: '#000',
    cursor: '#fff',
    cursorAccent: '#000',
    selection: 'rgba(255, 255, 255, 0.3)'
  };
}
