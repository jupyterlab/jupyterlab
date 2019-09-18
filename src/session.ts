// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { KernelMessage } from '@jupyterlab/services';

import { PromiseDelegate } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDebugger } from './tokens';

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
   * The client session to connect to a debugger.
   */
  private _client: IClientSession;

  get id() {
    return this.client.name;
  }

  get type() {
    return this.client.type;
  }

  get client(): IClientSession {
    return this._client;
  }

  set client(client: IClientSession | null) {
    if (this._client === client) {
      return;
    }

    if (this._client) {
      Signal.clearData(this._client);
    }

    this._client = client;
    this._client.iopubMessage.connect(this._handleEvent, this);
  }

  /**
   * The code editors in a debugger session.
   */
  editors: CodeEditor.IEditor[];

  /**
   * Dispose the debug session.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * A signal emitted when the debug session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Whether the debug session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Start a new debug session
   */
  async start(): Promise<void> {
    await this.sendRequest('initialize', {
      clientID: 'jupyterlab',
      clientName: 'JupyterLab',
      adapterID: 'python',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: true,
      locale: 'en-us'
    });

    await this.sendRequest('attach', {});
  }

  /**
   * Stop the running debug session.
   */
  async stop(): Promise<void> {
    await this.sendRequest('disconnect', {
      restart: false,
      terminateDebuggee: true
    });
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
    const message = await this._sendDebugMessage({
      type: 'request',
      seq: this._seq++,
      command,
      arguments: args
    });
    return message.content as IDebugger.ISession.Response[K];
  }

  /**
   * Signal emitted for debug event messages.
   */
  get eventMessage(): ISignal<DebugSession, IDebugger.ISession.Event> {
    return this._eventMessage;
  }

  /**
   * Handle debug events sent on the 'iopub' channel.
   */
  private _handleEvent(
    sender: IClientSession,
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
    const reply = new PromiseDelegate<KernelMessage.IDebugReplyMsg>();
    const kernel = this.client.kernel;
    const future = kernel.requestDebug(msg);
    future.onReply = (msg: KernelMessage.IDebugReplyMsg) => {
      return reply.resolve(msg);
    };
    await future.done;
    return reply.promise;
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed: boolean = false;
  private _eventMessage = new Signal<DebugSession, IDebugger.ISession.Event>(
    this
  );
  private _seq: number = 0;
}

/**
 * A namespace for `DebugSession` statics.
 */
export namespace DebugSession {
  export interface IOptions {
    /**
     * The client session used by the debug session.
     */
    client: IClientSession;
  }
}
