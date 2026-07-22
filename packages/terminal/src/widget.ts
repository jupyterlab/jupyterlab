// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import type { Terminal as TerminalNS } from '@jupyterlab/services';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { PromiseDelegate } from '@lumino/coreutils';
import { Platform } from '@lumino/domutils';
import type { Message } from '@lumino/messaging';
import { MessageLoop } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import type {
  ITerminalInitOnlyOptions,
  ITerminalOptions,
  Terminal as Xterm
} from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import type { SearchAddon } from '@xterm/addon-search';
import type { WebLinksAddon } from '@xterm/addon-web-links';
import type { WebglAddon } from '@xterm/addon-webgl';
import Color from 'color';
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
 * The class name for screen reader only text.
 */
const SR_ONLY_CLASS = 'jp-sr-only';

/**
 * The delay in milliseconds to reset the escape key press.
 */
const ESCAPE_FOCUS_DELAY_MS = 350;

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
   *
   * @param translator - The language translator.
   */
  constructor(
    session: TerminalNS.ITerminalConnection,
    options: Partial<ITerminal.IOptions> = {},
    translator?: ITranslator
  ) {
    super();
    translator = translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
    this.session = session;

    // Initialize settings.
    this._options = { ...ITerminal.defaultOptions, ...options };

    // Track the link under the pointer so that it can be exposed when the
    // context menu is opened (see `contextMenuLink`).
    const setHoveredLink = (link: string | null): void => {
      this._hoveredLink = link;
    };

    const { theme, ...other } = this._options;
    const xtermOptions = {
      theme: Private.getXTermTheme(theme),
      allowProposedApi: true, // To support xtermjs SearchAddon coloring.
      // Handle OSC 8 escape-sequence hyperlinks.
      linkHandler: {
        activate: (event: MouseEvent, uri: string) => {
          void Private.activateLink(this._trans, uri);
        },
        hover: (event: MouseEvent, uri: string) => {
          setHoveredLink(uri);
        },
        leave: () => {
          setHoveredLink(null);
        }
      },
      ...other
    };

    this.addClass(TERMINAL_CLASS);

    this._setThemeAttribute(theme);
    this._terminalId = Private.id++;
    this.id = `jp-Terminal-${this._terminalId}`;
    this._escapeInstructionsId = `jp-Terminal-escape-instructions-${this._terminalId}`;
    const escapeInstructions = document.createElement('p');
    escapeInstructions.id = this._escapeInstructionsId;
    escapeInstructions.className = SR_ONLY_CLASS;
    escapeInstructions.textContent = this._trans.__(
      'Press Escape twice to leave terminal focus. Press Enter to return focus to the terminal input.'
    );
    this.node.appendChild(escapeInstructions);

    // Buffer session message while waiting for the terminal
    let buffer = '';
    const bufferMessage = (
      sender: TerminalNS.ITerminalConnection,
      msg: TerminalNS.IMessage
    ): void => {
      // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
      switch (msg.type) {
        case 'stdout':
          if (msg.content) {
            buffer += msg.content[0] as string;
          }
          break;
        default:
          break;
      }
    };
    session.messageReceived.connect(bufferMessage);
    session.disposed.connect(() => {
      if (this.getOption('closeOnExit')) {
        this.dispose();
      }
    }, this);

    // Create the xterm.
    Private.createTerminal(xtermOptions, setHoveredLink)
      .then(([term, fitAddon, searchAddon]) => {
        this._term = term;
        this._fitAddon = fitAddon;
        this._searchAddon = searchAddon;
        this._initializeTerm();

        this.title.label = this._trans.__('Terminal');
        this._isReady = true;
        this._ready.resolve();

        if (buffer) {
          this._term.write(buffer);
        }
        session.messageReceived.disconnect(bufferMessage);
        session.messageReceived.connect(this._onMessage, this);

        if (session.connectionStatus === 'connected') {
          this._initialConnection();
        } else {
          session.connectionStatusChanged.connect(
            this._initialConnection,
            this
          );
        }
        this.update();
      })
      .catch(reason => {
        console.error('Failed to create a terminal.\n', reason);
        this._ready.reject(reason);
      });
  }

  /**
   * A promise that is fulfilled when the terminal is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * The terminal session associated with the widget.
   */
  readonly session: TerminalNS.ITerminalConnection;

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
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (option) {
      case 'fontFamily':
        this._term.options.fontFamily = value as string | undefined;
        break;
      case 'fontSize':
        this._term.options.fontSize = value as number | undefined;
        break;
      case 'lineHeight':
        this._term.options.lineHeight = value as number | undefined;
        break;
      case 'screenReaderMode':
        this._term.options.screenReaderMode = value as boolean | undefined;
        break;
      case 'scrollback':
        this._term.options.scrollback = value as number | undefined;
        break;
      case 'theme':
        this._term.options.theme = {
          ...Private.getXTermTheme(value as ITerminal.Theme)
        };
        this._setThemeAttribute(value as ITerminal.Theme);
        this._themeChanged.emit();
        break;
      case 'macOptionIsMeta':
        this._term.options.macOptionIsMeta = value as boolean | undefined;
        break;
      default:
        // Do not transmit options not listed above to XTerm
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
    void this.ready.then(() => {
      this._term.dispose();
    });
    super.dispose();
  }

  /**
   * Refresh the terminal session.
   *
   * #### Notes
   * Failure to reconnect to the session should be caught appropriately
   */
  async refresh(): Promise<void> {
    if (!this.isDisposed && this._isReady) {
      await this.session.reconnect();
      this._term.clear();
    }
  }

  /**
   * Check if terminal has any text selected.
   */
  hasSelection(): boolean {
    if (!this.isDisposed && this._isReady) {
      return this._term.hasSelection();
    }
    return false;
  }

  /**
   * Paste text into terminal.
   */
  paste(data: string): void {
    if (!this.isDisposed && this._isReady) {
      return this._term.paste(data);
    }
  }

  /**
   * Get selected text from terminal.
   */
  getSelection(): string | null {
    if (!this.isDisposed && this._isReady) {
      return this._term.getSelection();
    }
    return null;
  }

  /**
   * The URI of the link under the pointer when the context menu was last
   * opened over the terminal, or `null` if the context menu was not opened
   * over a link.
   * Public as needed by the `terminal:copy-link` command.
   */
  get contextMenuLink(): string | null {
    return this._contextMenuLink;
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
   * Return xtermjs SearchAddon.
   * Public as needed by TerminalSearchProvider
   */
  get searchAddon(): SearchAddon {
    return this._searchAddon;
  }

  /**
   * Return terminal theme.
   * Public as needed by TerminalSearchProvider
   */
  getXTermTheme(): ITerminal.IThemeObject {
    const { theme } = this._options;
    return Private.getXTermTheme(theme);
  }

  /**
   * A signal emitted when the terminal theme changes, this includes the when the lab theme
   * changes if the terminal theme is 'inherit'.
   */
  get themeChanged(): ISignal<this, void> {
    return this._themeChanged;
  }

  /**
   * A signal emitted when users should be reminded how to leave terminal focus.
   */
  get escapeHintRequested(): ISignal<this, void> {
    return this._escapeHintRequested;
  }

  /**
   * Set the size of the terminal when attached if dirty.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('keydown', this, true);
    this.node.addEventListener('contextmenu', this);
    this.update();
  }

  /**
   * Remove event listeners when the widget is detached.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this, true);
    this.node.removeEventListener('contextmenu', this);
    // The pointer leave callback may not fire when the widget is detached
    // while a link is hovered, so reset the hovered link explicitly.
    this._hoveredLink = null;
    this._clearEscapeResetTimer();
    this._escapePressedOnce = false;
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
    if (!this.isVisible || !this.isAttached || !this._isReady) {
      return;
    }

    // Open the terminal if necessary.
    if (!this._termOpened) {
      this._term.open(this.node);
      // Load the renderer addon after open so a failed activation leaves
      // the DOM renderer in place.
      Private.addRenderer(this._term);
      this._term.element?.classList.add(TERMINAL_BODY_CLASS);
      this._term.textarea?.setAttribute(
        'aria-describedby',
        this._escapeInstructionsId
      );
      this._term.element
        ?.querySelector('.xterm-viewport')
        ?.setAttribute('aria-describedby', this._escapeInstructionsId);
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
    const resize = Widget.ResizeMessage.UnknownSize;
    MessageLoop.sendMessage(this, resize);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._term?.focus();
  }

  private _initialConnection() {
    if (this.isDisposed) {
      return;
    }

    if (this.session.connectionStatus !== 'connected') {
      return;
    }

    this.title.label = this._trans.__('Terminal %1', this.session.name);
    this._setSessionSize();
    if (this._options.initialCommand) {
      this.session.send({
        type: 'stdin',
        content: [this._options.initialCommand + '\r']
      });
    }

    // Only run this initial connection logic once.
    this.session.connectionStatusChanged.disconnect(
      this._initialConnection,
      this
    );
  }

  /**
   * Initialize the terminal object.
   */
  private _initializeTerm(): void {
    const term = this._term;
    term.onData((data: string) => {
      if (this.isDisposed) {
        return;
      }
      this.session.send({
        type: 'stdin',
        content: [data]
      });
    });

    term.onTitleChange((title: string) => {
      this.title.label = title;
    });

    term.attachCustomKeyEventHandler(event => {
      // Send Shift+Enter as a line feed (\n) rather than carriage
      // return (\r), so terminal applications can distinguish
      // between Enter (execute) and Shift+Enter (newline). Handle
      // only keydown and call preventDefault() so the browser
      // suppresses the follow-up keypress event that xterm.js would
      // otherwise turn into a \r.
      // Skip during IME composition so composed text isn't split by
      // an injected \n.
      if (
        event.type === 'keydown' &&
        event.shiftKey &&
        event.key === 'Enter' &&
        !event.isComposing &&
        event.keyCode !== 229
      ) {
        event.preventDefault();
        this.session.send({
          type: 'stdin',
          content: ['\n']
        });
        return false;
      }

      // Do not add any Ctrl+C/Ctrl+V handling on macOS,
      // where Cmd+C/Cmd+V works as intended.
      if (Platform.IS_MAC) {
        return true;
      }

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
    sender: TerminalNS.ITerminalConnection,
    msg: TerminalNS.IMessage
  ): void {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (msg.type) {
      case 'stdout':
        if (msg.content) {
          this._term.write(msg.content[0] as string);
        }
        break;
      case 'disconnect':
        this._term.write('\r\n\r\n[Finished… Term Session]\r\n');
        break;
      default:
        break;
    }
  }

  /**
   * Resize the terminal based on computed geometry.
   */
  private _resizeTerminal() {
    if (this._options.autoFit) {
      this._fitAddon.fit();
    }
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
    const content = [
      this._term.rows,
      this._term.cols,
      this._offsetHeight,
      this._offsetWidth
    ];
    if (!this.isDisposed) {
      this.session.send({ type: 'set_size', content });
    }
  }

  private _setThemeAttribute(theme: string | null | undefined) {
    if (this.isDisposed) {
      return;
    }

    this.node.setAttribute(
      'data-term-theme',
      theme ? theme.toLowerCase() : 'inherit'
    );
  }

  /**
   * Handle the `keydown` event for the widget.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    const xtermViewport = this._term.element?.querySelector(
      '.xterm-viewport'
    ) as HTMLElement | null;
    const xtermTextarea = this._term.textarea;
    const activeElement = document.activeElement as HTMLElement | null;
    const viewportFocused =
      !!activeElement &&
      !!xtermViewport &&
      (activeElement === xtermViewport ||
        xtermViewport.contains(activeElement));
    const textareaFocused = !!xtermTextarea && activeElement === xtermTextarea;

    if (event.key === 'Escape') {
      if (!textareaFocused) {
        this._clearEscapeResetTimer();
        this._escapePressedOnce = false;
        return;
      }
      if (!this._escapePressedOnce) {
        this._escapePressedOnce = true;
        this._scheduleEscapeReset();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this._clearEscapeResetTimer();
      this._escapePressedOnce = false;
      if (xtermTextarea) {
        // This ensures pressing Tab does not return to the textarea and avoids
        // becoming a tab trap.
        xtermTextarea.tabIndex = -1;
      }
      xtermViewport?.setAttribute('tabindex', '0');
      xtermViewport?.focus();
      return;
    }

    this._clearEscapeResetTimer();
    this._escapePressedOnce = false;

    if (viewportFocused && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (xtermTextarea) {
        xtermTextarea.tabIndex = 0;
        xtermTextarea.focus();
      }
      return;
    }

    if (viewportFocused && event.key === 'Tab' && xtermTextarea) {
      xtermTextarea.tabIndex = -1;
    }

    // The viewport is not a native scroll container, so translate the
    // scrolling keys into xterm.js scroll API calls.
    if (viewportFocused) {
      let handled = true;
      switch (event.key) {
        case 'ArrowUp':
          this._term.scrollLines(-1);
          break;
        case 'ArrowDown':
          this._term.scrollLines(1);
          break;
        case 'PageUp':
          this._term.scrollPages(-1);
          break;
        case 'PageDown':
          this._term.scrollPages(1);
          break;
        case 'Home':
          this._term.scrollToTop();
          break;
        case 'End':
          this._term.scrollToBottom();
          break;
        default:
          handled = false;
      }
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  private _scheduleEscapeReset(): void {
    this._clearEscapeResetTimer();
    this._escapeResetTimer = window.setTimeout(() => {
      this._escapePressedOnce = false;
      this._escapeHintRequested.emit();
      this._escapeResetTimer = null;
    }, ESCAPE_FOCUS_DELAY_MS);
  }

  private _clearEscapeResetTimer(): void {
    if (this._escapeResetTimer !== null) {
      window.clearTimeout(this._escapeResetTimer);
      this._escapeResetTimer = null;
    }
  }

  private _contextMenuLink: string | null = null;
  private _fitAddon: FitAddon;
  private _hoveredLink: string | null = null;
  private _searchAddon: SearchAddon;
  private _needsResize = true;
  private _offsetWidth = -1;
  private _offsetHeight = -1;
  private _options: ITerminal.IOptions;
  private _isReady = false;
  private _ready = new PromiseDelegate<void>();
  private _term: Xterm;
  private _termOpened = false;
  private _trans: TranslationBundle;
  private _themeChanged = new Signal<this, void>(this);
  private _escapeHintRequested = new Signal<this, void>(this);
  private _escapePressedOnce = false;
  private _escapeResetTimer: number | null = null;
  private _terminalId: number;
  private _escapeInstructionsId: string;

  /**
   * Handle the DOM events for the widget.
   *
   * @param event -The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the terminal widget's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeyDown(event as KeyboardEvent);
        break;
      case 'contextmenu':
        // Capture the hovered link when the context menu is being opened,
        // as the pointer leaves the link once the menu is displayed.
        this._contextMenuLink = this._hoveredLink;
        break;
      default:
        break;
    }
  }
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
    selectionBackground: 'rgba(97, 97, 97, 0.3)', // md-grey-700
    selectionInactiveBackground: 'rgba(189, 189, 189, 0.3)', // md-grey-400
    activeMatchBackground: '#ffee58' // md-yellow-400
  };

  /**
   * The dark terminal theme.
   */
  export const darkTheme: ITerminal.IThemeObject = {
    foreground: '#fff',
    background: '#000',
    cursor: '#fff',
    cursorAccent: '#000',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    selectionInactiveBackground: 'rgba(238, 238, 238, 0.3)', // md-grey-200
    activeMatchBackground: '#F57F17' // md-yellow-900
  };

  /**
   * The current theme.
   */
  export const inheritTheme = (): ITerminal.IThemeObject => {
    const bodyStyle = getComputedStyle(document.body);
    const background = bodyStyle.getPropertyValue('--jp-layout-color0').trim();

    let activeMatchBackground = '#ffee58'; // md-yellow-400 for light mode background
    try {
      if (Color(background).isDark()) {
        activeMatchBackground = '#F57F17'; // md-yellow-900 for dark mode background
      }
    } catch (e) {
      // Use the light mode default.
    }

    return {
      foreground: bodyStyle.getPropertyValue('--jp-ui-font-color0').trim(),
      background,
      cursor: bodyStyle.getPropertyValue('--jp-ui-font-color1').trim(),
      cursorAccent: bodyStyle
        .getPropertyValue('--jp-ui-inverse-font-color0')
        .trim(),
      selectionBackground: bodyStyle
        .getPropertyValue('--jp-layout-color3')
        .trim(),
      selectionInactiveBackground: bodyStyle
        .getPropertyValue('--jp-layout-color2')
        .trim(),
      activeMatchBackground
    };
  };

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

/**
 * Utility functions for creating a Terminal widget
 */
namespace Private {
  let Xterm_: typeof Xterm;
  let FitAddon_: typeof FitAddon;
  let WeblinksAddon_: typeof WebLinksAddon;
  let SearchAddon_: typeof SearchAddon;
  let WebglAddon_: typeof WebglAddon | undefined;
  let initPromise: Promise<void> | undefined;

  /**
   * Detect if the browser supports WebGL2 or not, which the xterm.js
   * WebGL addon requires.
   *
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
   */
  function hasWebGL2Context(): boolean {
    // Create canvas element. The canvas is not added to the
    // document itself, so it is never displayed in the
    // browser window.
    const canvas = document.createElement('canvas');

    // Get WebGL2RenderingContext from canvas element.
    const gl = canvas.getContext('webgl2');

    // Report the result.
    try {
      return gl instanceof WebGL2RenderingContext;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load the xterm.js modules, at most once.
   */
  async function initialize(): Promise<void> {
    const [xterm_, fitAddon_, weblinksAddon_, searchAddon_] = await Promise.all(
      [
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
        import('@xterm/addon-search')
      ]
    );
    Xterm_ = xterm_.Terminal;
    FitAddon_ = fitAddon_.FitAddon;
    WeblinksAddon_ = weblinksAddon_.WebLinksAddon;
    SearchAddon_ = searchAddon_.SearchAddon;
    if (hasWebGL2Context()) {
      try {
        const webglAddon_ = await import('@xterm/addon-webgl');
        WebglAddon_ = webglAddon_.WebglAddon;
      } catch (error) {
        console.warn(
          'Failed to load the WebGL renderer, falling back to the DOM renderer.',
          error
        );
      }
    }
  }

  /**
   * Attach the WebGL renderer to an opened terminal.
   *
   * The built-in DOM renderer is used when the WebGL addon is unavailable
   * or fails to activate.
   */
  export function addRenderer(term: Xterm): void {
    if (!WebglAddon_) {
      return;
    }
    try {
      const renderer = new WebglAddon_();
      term.loadAddon(renderer);
      renderer.onContextLoss(() => {
        console.debug('WebGL context lost - reinitialize Xtermjs renderer.');
        renderer.dispose();
        // If the Webgl context is lost, reinitialize the addon
        addRenderer(term);
      });
    } catch (error) {
      console.warn(
        'Failed to activate the WebGL renderer, falling back to the DOM renderer.',
        error
      );
    }
  }

  /**
   * Create a xterm.js terminal asynchronously.
   *
   * @param options - The xterm.js terminal options.
   *
   * @param onLinkHover - A callback invoked with the URI of the link under
   * the pointer, or `null` when the pointer leaves the link.
   */
  export async function createTerminal(
    options: ITerminalOptions & ITerminalInitOnlyOptions,
    onLinkHover: (link: string | null) => void
  ): Promise<[Xterm, FitAddon, SearchAddon]> {
    if (!initPromise) {
      initPromise = initialize();
      // Allow a later terminal to retry if the modules failed to load, for
      // example because of a transient network failure.
      initPromise.catch(() => {
        initPromise = undefined;
      });
    }
    await initPromise;

    const term = new Xterm_(options);
    const fitAddon = new FitAddon_();
    term.loadAddon(fitAddon);
    const searchAddon = new SearchAddon_();
    term.loadAddon(
      new WeblinksAddon_(undefined, {
        hover: (event: MouseEvent, uri: string) => {
          onLinkHover(uri);
        },
        leave: () => {
          onLinkHover(null);
        }
      })
    );
    term.loadAddon(searchAddon);
    return [term, fitAddon, searchAddon];
  }

  /**
   * Open a link that was activated in the terminal.
   *
   * Like the default OSC 8 hyperlink activation behavior of xterm.js, the
   * user is asked to confirm before navigating: the target URI of an
   * escape-sequence hyperlink can be unrelated to the displayed text.
   */
  export async function activateLink(
    trans: TranslationBundle,
    uri: string
  ): Promise<void> {
    const { button } = await showDialog({
      title: trans.__('Open Link?'),
      body: trans.__(
        'Do you want to navigate to %1? This link could potentially be dangerous.',
        uri
      ),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: trans.__('Open') })
      ]
    });
    if (!button.accept) {
      return;
    }
    const newWindow = window.open();
    if (newWindow) {
      try {
        newWindow.opener = null;
      } catch {
        // no-op, Electron can throw
      }
      newWindow.location.href = uri;
    } else {
      console.warn('Opening link blocked as opener could not be cleared');
    }
  }
}
