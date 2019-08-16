// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { KernelMessage, Kernel } from '@jupyterlab/services';

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
    this.client.iopubMessage.connect(this._handleEvent, this);
  }

  /**
   * The client session to connect to a debugger.
   */
  client: IClientSession;

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
    if (this._executeFuture) {
      this._executeFuture.dispose();
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
   * Request code execution.
   */
  async execute(code: string): Promise<void> {
    void this._sendExecuteMessage({ code });
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

  /**
   * Send an execute request message to the kernel.
   * @param msg execute request message to send to the kernel.
   */
  private async _sendExecuteMessage(
    msg: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<void> {
    const kernel = this.client.kernel;
    if (this._executeFuture) {
      this._executeFuture.dispose();
    }
    this._executeFuture = kernel.requestExecute(msg);
    this._executeFuture.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {};
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed: boolean = false;
  private _executeFuture: Kernel.IShellFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > | null = null;
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
