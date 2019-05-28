// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TerminalSession } from '@jupyterlab/services';

import { Platform } from '@phosphor/domutils';

import { Message, MessageLoop } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { Terminal as Xterm } from 'xterm';

import { fit } from 'xterm/lib/addons/fit/fit';

import { ITerminal } from '.';

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
export class Terminal extends Widget implements ITerminal.ITerminal {
  /**
   * Construct a new terminal widget.
   *
   * @param session - The terminal session object.
   *
   * @param options - The terminal configuration options.
   */
  constructor(
    session: TerminalSession.ISession,
    options: Partial<ITerminal.IOptions> = {}
  ) {
    super();

    this.session = session;

    // Initialize settings.
    this._options = { ...ITerminal.defaultOptions, ...options };

    const { initialCommand, theme, ...other } = this._options;
    const xtermOptions = {
      theme: Private.getXTermTheme(theme),
      ...other
    };

    this.addClass(TERMINAL_CLASS);

    // Create the xterm.
    this._term = new Xterm(xtermOptions);
    this._initializeTerm();

    this.id = `jp-Terminal-${Private.id++}`;
    this.title.label = 'Terminal';

    session.messageReceived.connect(this._onMessage, this);
    session.terminated.connect(this.dispose, this);

    void session.ready.then(() => {
      if (this.isDisposed) {
        return;
      }

      this.title.label = `Terminal ${session.name}`;
      this._setSessionSize();
      if (this._options.initialCommand) {
        this.session.send({
          type: 'stdin',
          content: [this._options.initialCommand + '\r']
        });
      }
    });
  }

  /**
   * The terminal session associated with the widget.
   */
  readonly session: TerminalSession.ISession;

  /**
   * Get a config option for the terminal.
   */
  getOption<K extends keyof ITerminal.IOptions>(
    option: K
  ): ITerminal.IOptions[K] {
    return this._options[option];
  }

  /**
   * Set a config option for the terminal.
   */
  setOption<K extends keyof ITerminal.IOptions>(
    option: K,
    value: ITerminal.IOptions[K]
  ): void {
    if (
      option !== 'theme' &&
      (this._options[option] === value || option === 'initialCommand')
    ) {
      return;
    }

    this._options[option] = value;

    switch (option) {
      case 'shutdownOnClose': // Do not transmit to XTerm
        break;
      case 'theme':
        this._term.setOption(
          'theme',
          Private.getXTermTheme(value as ITerminal.Theme)
        );
        break;
      default:
        this._term.setOption(option, value);
        break;
    }

    this._needsResize = true;
    this.update();
  }

  /**
   * Dispose of the resources held by the terminal widget.
   */
  dispose(): void {
    if (!this.session.isDisposed) {
      if (this.getOption('shutdownOnClose')) {
        this.session.shutdown().catch(reason => {
          console.error(`Terminal not shut down: ${reason}`);
        });
      }
    }
    this._term.dispose();
    super.dispose();
  }

  /**
   * Refresh the terminal session.
   *
   * #### Notes
   * Failure to reconnect to the session should be caught appropriately
   */
  async refresh(): Promise<void> {
    if (!this.isDisposed) {
      await this.session.reconnect();
      this._term.clear();
    }
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
    const term = this._term;
    term.on('data', (data: string) => {
      if (this.isDisposed) {
        return;
      }
      this.session.send({
        type: 'stdin',
        content: [data]
      });
    });

    term.on('title', (title: string) => {
      this.title.label = title;
    });

    // Do not add any Ctrl+C/Ctrl+V handling on macOS,
    // where Cmd+C/Cmd+V works as intended.
    if (Platform.IS_MAC) {
      return;
    }

    term.attachCustomKeyEventHandler(event => {
      if (event.ctrlKey && event.key === 'c' && term.hasSelection()) {
        // Return so that the usual OS copy happens
        // instead of interrupt signal.
        return false;
      }

      if (event.ctrlKey && event.key === 'v' && this._options.pasteWithCtrlV) {
        // Return so that the usual paste happens.
        return false;
      }

      return true;
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
    if (!this.isDisposed) {
      this.session.send({ type: 'set_size', content });
    }
  }

  private readonly _term: Xterm;
  private _needsResize = true;
  private _termOpened = false;
  private _offsetWidth = -1;
  private _offsetHeight = -1;
  private _options: ITerminal.IOptions;
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
  export const lightTheme: ITerminal.IThemeObject = {
    foreground: '#000',
    background: '#fff',
    cursor: '#616161', // md-grey-700
    cursorAccent: '#F5F5F5', // md-grey-100
    selection: 'rgba(97, 97, 97, 0.3)' // md-grey-700
  };

  /**
   * The dark terminal theme.
   */
  export const darkTheme: ITerminal.IThemeObject = {
    foreground: '#fff',
    background: '#000',
    cursor: '#fff',
    cursorAccent: '#000',
    selection: 'rgba(255, 255, 255, 0.3)'
  };

  /**
   * The current theme.
   */
  export const inheritTheme = (): ITerminal.IThemeObject => ({
    foreground: getComputedStyle(document.body).getPropertyValue(
      '--jp-ui-font-color0'
    ),
    background: getComputedStyle(document.body).getPropertyValue(
      '--jp-layout-color0'
    ),
    cursor: getComputedStyle(document.body).getPropertyValue(
      '--jp-ui-font-color1'
    ),
    cursorAccent: getComputedStyle(document.body).getPropertyValue(
      '--jp-ui-inverse-font-color0'
    ),
    selection: getComputedStyle(document.body).getPropertyValue(
      '--jp-ui-font-color3'
    )
  });

  export function getXTermTheme(
    theme: ITerminal.Theme
  ): ITerminal.IThemeObject {
    switch (theme) {
      case 'light':
        return lightTheme;
      case 'dark':
        return darkTheme;
      case 'inherit':
      default:
        return inheritTheme();
    }
  }
}
