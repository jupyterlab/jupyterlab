// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as utils
  from 'jupyter-js-utils';

import {
  IBoxSizing, boxSizing
} from 'phosphor-domutil';

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';

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
 * The url for the terminal service.
 */
const TERMINAL_SERVICE_URL = 'api/terminals';


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

    // Initialize options.
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._ajaxSettings = options.ajaxSettings || {};
    this._name = options.name;

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
    this.title.text = 'Terminal';
    Xterm.brokenBold = true;

    // Handle websocket connection.
    let wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    if (this._name) {
      this._intializeSocket(wsUrl);
    } else {
      this._getName().then(name => {
        this._name = name;
        this._intializeSocket(wsUrl);
      });
    }
  }

  /**
   * A signal emitted when the terminal is fully connected.
   */
  get connected(): ISignal<TerminalWidget, void> {
    return Private.connectedSignal.bind(this);
  }

  /**
   * Test whether the terminal session is connected.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * Get the name of the terminal session.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return this._name;
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
    this._ws.close();
    this._term.destroy();
    this._sheet = null;
    this._ws = null;
    this._term = null;
    this._dummyTerm = null;
    this._box = null;
    super.dispose();
  }

  /**
   * Shut down the terminal session.
   */
  shutdown(): Promise<void> {
    let url = utils.urlPathJoin(this._baseUrl, TERMINAL_SERVICE_URL);
    let ajaxSettings = utils.copy(this._ajaxSettings);
    ajaxSettings.method = 'DELETE';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw new Error('Invalid Response: ' + success.xhr.status);
      }
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
    this._term.focus();
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
    this.node.style.backgroundColor = this.background;
    this.node.style.color = this.color;
    this._term.element.style.backgroundColor = this.background;
    this._term.element.style.color = this.color;
    this._sheet.innerHTML = (`#${this.node.id} .terminal-cursor {background:
                             ${this.color};color:${this.background};}`);
  }

  /**
   * A message handler invoked on an `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    let resize = ResizeMessage.UnknownSize;
    sendMessage(this, resize);
  }

  /**
   * Get a name for the terminal from the server.
   */
  private _getName(): Promise<string> {
    let url = utils.urlPathJoin(this._baseUrl, TERMINAL_SERVICE_URL);
    let ajaxSettings = utils.copy(this._ajaxSettings);
    ajaxSettings.method = 'POST';
    ajaxSettings.dataType = 'json';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw new Error('Invalid Response: ' + success.xhr.status);
      }
      return (success.data as TerminalWidget.IModel).name;
    });
  }

  /**
   * Connect to the websocket.
   */
  private _intializeSocket(wsUrl: string): void {
    let name = this._name;
    let url = `${wsUrl}terminals/websocket/${name}`;
    this._ws = new WebSocket(url);

    // Set the default title.
    this.title.text = `Terminal ${name}`;

    this._ws.onopen = (event: MessageEvent) => {
      this._connected = true;
      if (this._dirty) {
        this._resizeTerminal(-1, -1);
      }
      this.connected.emit(void 0);
    };

    this._ws.onmessage = (event: MessageEvent) => {
      this._handleWSMessage(event);
    };
  }

  /**
   * Create the terminal object.
   */
  private _initializeTerm(): void {
    this._term.open(this.node);
    this._term.element.classList.add(TERMINAL_BODY_CLASS);

    this._term.on('data', (data: string) => {
      this._ws.send(JSON.stringify(['stdin', data]));
    });

    this._term.on('title', (title: string) => {
        this.title.text = title;
    });
  }

  /**
   * Handle a message from the terminal websocket.
   */
  private _handleWSMessage(event: MessageEvent): void {
    let msg = JSON.parse(event.data);
    switch (msg[0]) {
    case 'stdout':
      this._term.write(msg[1]);
      break;
    case 'disconnect':
      this._term.write('\r\n\r\n[Finished... Term Session]\r\n');
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
    if (this._rowHeight === -1 || !this.isVisible || !this._connected) {
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
    this._ws.send(JSON.stringify(['set_size', rows, cols,
                                height, width]));
    this._dirty = false;
    this.update();
  }

  private _term: Xterm = null;
  private _ws: WebSocket = null;
  private _sheet: HTMLElement = null;
  private _dummyTerm: HTMLElement = null;
  private _fontSize = -1;
  private _dirty = false;
  private _rowHeight = -1;
  private _colWidth = -1;
  private _background = '';
  private _color = '';
  private _box: IBoxSizing = null;
  private _connected = false;
  private _name: string;
  private _baseUrl: string;
  private _ajaxSettings: utils.IAjaxSettings = null;
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
     * The name of the terminal.
     */
    name?: string;

    /**
     * The base url.
     */
    baseUrl?: string;

    /**
     * The base websocket url.
     */
    wsUrl?: string;

    /**
     * The Ajax settings used for server requests.
     */
    ajaxSettings?: utils.IAjaxSettings;

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

  /**
   * The server model for a terminal widget.
   */
  export
  interface IModel {
    /**
     * The name of the terminal session.
     */
    name: string;
  }
}


/**
 * A terminal session manager.
 */
export
class TerminalManager {
  /**
   * Construct a new terminal manager.
   */
  constructor(options: TerminalManager.IOptions) {
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._ajaxSettings = utils.copy(options.ajaxSettings) || {};
  }

  /**
   * Create a new terminal.
   */
  createNew(options?: TerminalWidget.IOptions): TerminalWidget {
    options = options || {};
    options.baseUrl = options.baseUrl || this._baseUrl;
    options.wsUrl = options.wsUrl || this._wsUrl;
    options.ajaxSettings = (
      options.ajaxSettings || utils.copy(this._ajaxSettings)
    );
    return new TerminalWidget(options);
  }

  /**
   * Shut down a terminal session by name.
   */
  shutdown(name: string): Promise<void> {
    let url = utils.urlPathJoin(this._baseUrl, TERMINAL_SERVICE_URL);
    let ajaxSettings = utils.copy(this._ajaxSettings) || {};
    ajaxSettings.method = 'DELETE';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw new Error('Invalid Response: ' + success.xhr.status);
      }
    });
  }

  /**
   * Get the list of models for the terminals running on the server.
   */
  listRunning(): Promise<TerminalWidget.IModel[]> {
    let url = utils.urlPathJoin(this._baseUrl, TERMINAL_SERVICE_URL);
    let ajaxSettings = utils.copy(this._ajaxSettings) || {};
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw new Error('Invalid Response: ' + success.xhr.status);
      }
      let data = success.data as TerminalWidget.IModel[];
      if (!Array.isArray(data)) {
        throw new Error('Invalid terminal data');
      }
      return data;
    });
  }

  private _baseUrl = '';
  private _wsUrl = '';
  private _ajaxSettings: utils.IAjaxSettings = null;
}


/**
 * The namespace for TerminalManager statics.
 */
export
namespace TerminalManager {
  /**
   * The options used to initialize a terminal manager.
   */
  export
  interface IOptions {
    /**
     * The base url.
     */
    baseUrl?: string;

    /**
     * The base websocket url.
     */
    wsUrl?: string;

    /**
     * The Ajax settings used for server requests.
     */
    ajaxSettings?: utils.IAjaxSettings;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when the terminal is fully connected.
   */
  export
  const connectedSignal = new Signal<TerminalWidget, void>();

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
  var id = 0;
}
