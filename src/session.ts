// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { KernelMessage, Session } from '@jupyterlab/services';

import { PromiseDelegate } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDebugger } from './tokens';

/**
 * A concrete implementation of IDebugger.ISession.
 */
export class DebugSession implements IDebugger.ISession {
  /**
   * Instantiate a new debug session
   *
   * @param options - The debug session instantiation options.
   */
  constructor(options: DebugSession.IOptions) {
    this.client = options.client;
  }

  /**
   * Whether the debug session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when the debug session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Returns the API client session to connect to a debugger.
   */
  get client(): IClientSession | Session.ISession {
    return this._client;
  }

  /**
   * Sets the API client session to connect to a debugger to
   * the given parameter.
   *
   * @param client - The new API client session.
   */
  set client(client: IClientSession | Session.ISession | null) {
    if (this._client === client) {
      return;
    }

    if (this._client) {
      this._client.iopubMessage.disconnect(this._handleEvent, this);
    }

    this._client = client;

    if (this._client) {
      this._client.iopubMessage.connect(this._handleEvent, this);

      if (this.client instanceof ClientSession) {
        this._ready = this.client.ready.then(_ => this.client.kernel.ready);
      } else {
        this._ready = this.client.kernel.ready;
      }
    }
  }

  /**
   * Whether the debug session is started
   */
  get isStarted(): boolean {
    return this._isStarted;
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
    await this._ready;
    await this.sendRequest('initialize', {
      clientID: 'jupyterlab',
      clientName: 'JupyterLab',
      adapterID: this.client.kernel?.name ?? '',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true,
      locale: 'en-us'
    });

    this._isStarted = true;

    await this.sendRequest('attach', {});
  }

  /**
   * Stop the running debug session.
   */
  async stop(): Promise<void> {
    await this._ready;
    await this.sendRequest('disconnect', {
      restart: false,
      terminateDebuggee: true
    });
    this._isStarted = false;
  }

  /**
   * Restore the state of a debug session.
   */
  async restoreState(): Promise<IDebugger.ISession.Response['debugInfo']> {
    await this._ready;
    const message = await this.sendRequest('debugInfo', {});
    this._isStarted = message.body.isStarted;
    return message;
  }

  /**
   * Send a custom debug request to the kernel.
   * @param command debug command.
   * @param args arguments for the debug command.
   */
  async sendRequest<K extends keyof IDebugger.ISession.Request>(
    command: K,
    args: IDebugger.ISession.Request[K]
  ): Promise<IDebugger.ISession.Response[K]> {
    await this._ready;
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
   * @param sender - the emitter of the event.
   * @param message - the event message.
   */
  private _handleEvent(
    sender: IClientSession | Session.ISession,
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
   * @param msg debug request message to send to the kernel.
   */
  private async _sendDebugMessage(
    msg: KernelMessage.IDebugRequestMsg['content']
  ): Promise<KernelMessage.IDebugReplyMsg> {
    const kernel = this.client.kernel;
    if (!kernel) {
      return Promise.reject(
        new Error('A kernel is required to send debug messages.')
      );
    }
    const reply = new PromiseDelegate<KernelMessage.IDebugReplyMsg>();
    const future = kernel.requestDebug(msg);
    future.onReply = (msg: KernelMessage.IDebugReplyMsg) => {
      return reply.resolve(msg);
    };
    await future.done;
    return reply.promise;
  }

  private _seq = 0;
  private _client: IClientSession | Session.ISession;
  private _ready: Promise<void>;
  private _isDisposed = false;
  private _isStarted = false;
  private _disposed = new Signal<this, void>(this);
  private _eventMessage = new Signal<
    IDebugger.ISession,
    IDebugger.ISession.Event
  >(this);
}

/**
 * A namespace for `DebugSession` statics.
 */
export namespace DebugSession {
  export interface IOptions {
    /**
     * The client session used by the debug session.
     */
    client: IClientSession | Session.ISession;
  }

  /**
   * Request whether debugging is enabled for the given client.
   * @param client The client session.
   */
  export async function requestDebuggingEnabled(
    client: IClientSession | Session.ISession
  ): Promise<boolean> {
    if (client instanceof ClientSession) {
      await client.ready;
    }
    await client.kernel.ready;
    const info = (client.kernel?.info as IDebugger.ISession.IInfoReply) ?? null;
    return !!(info?.debugger ?? false);
  }
}
