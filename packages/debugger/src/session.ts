// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelMessage, Session } from '@jupyterlab/services';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { PromiseDelegate } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import { DebugProtocol } from '@vscode/debugprotocol';

import { IDebugger } from './tokens';

/**
 * A concrete implementation of IDebugger.ISession.
 */
export class DebuggerSession implements IDebugger.ISession {
  /**
   * Instantiate a new debug session
   *
   * @param options - The debug session instantiation options.
   */
  constructor(options: DebuggerSession.IOptions) {
    this.connection = options.connection;
    this._config = options.config;
    this.translator = options.translator || nullTranslator;
  }

  /**
   * Whether the debug session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Returns the initialize response .
   */
  get capabilities(): DebugProtocol.Capabilities | undefined {
    return this._capabilities;
  }

  /**
   * A signal emitted when the debug session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Returns the API session connection to connect to a debugger.
   */
  get connection(): Session.ISessionConnection | null {
    return this._connection;
  }

  /**
   * Sets the API session connection to connect to a debugger to
   * the given parameter.
   *
   * @param connection - The new API session connection.
   */
  set connection(connection: Session.ISessionConnection | null) {
    if (this._connection) {
      this._connection.iopubMessage.disconnect(this._handleEvent, this);
    }
    this._connection = connection;

    if (!this._connection) {
      this._isStarted = false;
      return;
    }

    this._connection.iopubMessage.connect(this._handleEvent, this);

    this._ready = new PromiseDelegate<void>();
    const future = this.connection?.kernel?.requestDebug({
      type: 'request',
      seq: 0,
      command: 'debugInfo'
    });
    if (future) {
      future.onReply = (msg: KernelMessage.IDebugReplyMsg): void => {
        this._ready.resolve();
        future.dispose();
      };
    }
  }

  /**
   * Whether the debug session is started.
   */
  get isStarted(): boolean {
    return this._isStarted;
  }

  /**
   * Exception paths defined by the debugger
   */
  get exceptionPaths(): string[] {
    return this._exceptionPaths;
  }

  /**
   * Exception breakpoint filters defined by the debugger
   */
  get exceptionBreakpointFilters():
    | DebugProtocol.ExceptionBreakpointsFilter[]
    | undefined {
    return this._exceptionBreakpointFilters;
  }

  /**
   * Get current exception filters.
   */
  get currentExceptionFilters(): string[] {
    const kernel = this.connection?.kernel?.name ?? '';
    if (!kernel) {
      return [];
    }
    const tmpFileParams = this._config.getTmpFileParams(kernel);
    if (!tmpFileParams) {
      return [];
    }
    let prefix = tmpFileParams.prefix;
    if (Object.keys(this._currentExceptionFilters).includes(prefix)) {
      return this._currentExceptionFilters[prefix];
    }
    return [];
  }

  /**
   * Set current exception filters.
   */
  set currentExceptionFilters(exceptionFilters: string[] | null) {
    const kernel = this.connection?.kernel?.name ?? '';
    if (!kernel) {
      return;
    }
    const tmpFileParams = this._config.getTmpFileParams(kernel);
    if (!tmpFileParams) {
      return;
    }
    let prefix = tmpFileParams.prefix;
    if (exceptionFilters === null) {
      if (Object.keys(this._currentExceptionFilters).includes(prefix)) {
        delete this._currentExceptionFilters[prefix];
      }
    } else {
      this._currentExceptionFilters[prefix] = exceptionFilters;
    }
  }

  /**
   * Signal emitted for debug event messages.
   */
  get eventMessage(): ISignal<IDebugger.ISession, IDebugger.ISession.Event> {
    return this._eventMessage;
  }

  /**
   * Dispose the debug session.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Start a new debug session
   */
  async start(): Promise<void> {
    const initializeResponse = await this.sendRequest('initialize', {
      clientID: 'jupyterlab',
      clientName: 'JupyterLab',
      adapterID: this.connection?.kernel?.name ?? '',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true,
      locale: document.documentElement.lang
    });

    if (!initializeResponse.success) {
      throw new Error(
        `Could not start the debugger: ${initializeResponse.message}`
      );
    }
    this._capabilities = initializeResponse.body;
    this._isStarted = true;
    this._exceptionBreakpointFilters =
      initializeResponse.body?.exceptionBreakpointFilters;
    await this.sendRequest('attach', {});
  }

  /**
   * Stop the running debug session.
   */
  async stop(): Promise<void> {
    this._isStarted = false;
    await this.sendRequest('disconnect', {
      restart: false,
      terminateDebuggee: false
    });
  }

  /**
   * Restore the state of a debug session.
   */
  async restoreState(): Promise<IDebugger.ISession.Response['debugInfo']> {
    const message = await this.sendRequest('debugInfo', {});
    this._isStarted = message.body.isStarted;
    this._exceptionPaths = message.body?.exceptionPaths;
    return message;
  }

  /**
   * Whether the debugger is pausing on exception.
   *
   * @param filter - Specify a filter
   */
  isPausingOnException(filter?: string): boolean {
    if (filter) {
      return this.currentExceptionFilters?.includes(filter) ?? false;
    } else {
      return this.currentExceptionFilters.length > 0;
    }
  }

  /**
   * Send a custom debug request to the kernel.
   *
   * @param command debug command.
   * @param args arguments for the debug command.
   */
  async sendRequest<K extends keyof IDebugger.ISession.Request>(
    command: K,
    args: IDebugger.ISession.Request[K]
  ): Promise<IDebugger.ISession.Response[K]> {
    await this._ready.promise;
    const message = await this._sendDebugMessage({
      type: 'request',
      seq: this._seq++,
      command,
      arguments: args
    });
    return message.content as IDebugger.ISession.Response[K];
  }

  /**
   * Handle debug events sent on the 'iopub' channel.
   *
   * @param sender - the emitter of the event.
   * @param message - the event message.
   */
  private _handleEvent(
    sender: Session.ISessionConnection,
    message: KernelMessage.IIOPubMessage
  ): void {
    const msgType = message.header.msg_type;
    if (msgType !== 'debug_event') {
      return;
    }
    const event = message.content as IDebugger.ISession.Event;
    this._eventMessage.emit(event);
  }

  /**
   * Send a debug request message to the kernel.
   *
   * @param msg debug request message to send to the kernel.
   */
  private async _sendDebugMessage(
    msg: KernelMessage.IDebugRequestMsg['content']
  ): Promise<KernelMessage.IDebugReplyMsg> {
    const kernel = this.connection?.kernel;
    if (!kernel) {
      return Promise.reject(
        new Error('A kernel is required to send debug messages.')
      );
    }
    const reply = new PromiseDelegate<KernelMessage.IDebugReplyMsg>();
    const future = kernel.requestDebug(msg);
    future.onReply = (msg: KernelMessage.IDebugReplyMsg): void => {
      reply.resolve(msg);
    };
    await future.done;
    return reply.promise;
  }

  protected translator: ITranslator;
  private _seq = 0;
  private _ready = new PromiseDelegate<void>();
  private _connection: Session.ISessionConnection | null;
  private _config: IDebugger.IConfig;
  private _capabilities: DebugProtocol.Capabilities | undefined;
  private _isDisposed = false;
  private _isStarted = false;
  private _exceptionPaths: string[] = [];
  private _exceptionBreakpointFilters:
    | DebugProtocol.ExceptionBreakpointsFilter[]
    | undefined = [];
  private _currentExceptionFilters: IDebugger.ISession.IExceptionFilter = {};
  private _disposed = new Signal<this, void>(this);
  private _eventMessage = new Signal<
    IDebugger.ISession,
    IDebugger.ISession.Event
  >(this);
}

/**
 * A namespace for `DebuggerSession` statics.
 */
export namespace DebuggerSession {
  /**
   * Instantiation options for a `DebuggerSession`.
   */
  export interface IOptions {
    /**
     * The session connection used by the debug session.
     */
    connection: Session.ISessionConnection;

    /**
     * The debugger config
     */
    config: IDebugger.IConfig;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
