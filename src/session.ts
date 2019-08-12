// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { KernelMessage } from '@jupyterlab/services';

import { PromiseDelegate } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

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
   * Dispose the debug session.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.client.iopubMessage.disconnect(this._handleEvent, this);
    this._isDisposed = true;
    this._disposed.emit();
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
  public async start(): Promise<void> {
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
  public async stop(): Promise<void> {
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
  async sendRequest<K extends keyof DebugSession.IDebugRequestTypes>(
    command: K,
    args: DebugSession.IDebugRequestTypes[K]
  ): Promise<DebugSession.IDebugResponseTypes[K]> {
    const message = await this._sendDebugMessage({
      type: 'request',
      seq: this._seq++,
      command,
      arguments: args
    });
    return message.content as DebugSession.IDebugResponseTypes[K];
  }

  /**
   * Signal emitted for debug event messages.
   */
  get eventMessage(): ISignal<DebugSession, DebugProtocol.Event> {
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
    const event = message.content as DebugProtocol.Event;
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
      if (!msg.content.success) {
        return reply.reject(msg);
      }
      return reply.resolve(msg);
    };
    await future.done;
    return reply.promise;
  }

  client: IClientSession;
  editors: CodeEditor.IEditor[];

  private _disposed = new Signal<this, void>(this);
  private _isDisposed: boolean = false;

  private _eventMessage = new Signal<DebugSession, DebugProtocol.Event>(this);

  /**
   * Debug protocol sequence number.
   */
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

  export interface IUpdateCellArguments {
    cellId: number;
    nextId: number;
    code: string;
  }

  export interface IUpdateCellResponse extends DebugProtocol.Response {
    body: {
      sourcePath: string;
    };
  }

  /**
   * Interface for all the debug requests types.
   */
  export interface IDebugRequestTypes {
    attach: DebugProtocol.AttachRequestArguments;
    completions: DebugProtocol.CompletionsArguments;
    configurationDone: DebugProtocol.ConfigurationDoneArguments;
    continue: DebugProtocol.ContinueArguments;
    disconnect: DebugProtocol.DisconnectArguments;
    evaluate: DebugProtocol.EvaluateArguments;
    exceptionInfo: DebugProtocol.ExceptionInfoArguments;
    goto: DebugProtocol.GotoArguments;
    gotoTargets: DebugProtocol.GotoTargetsArguments;
    initialize: DebugProtocol.InitializeRequestArguments;
    launch: DebugProtocol.LaunchRequestArguments;
    loadedSources: DebugProtocol.LoadedSourcesArguments;
    modules: DebugProtocol.ModulesArguments;
    next: DebugProtocol.NextArguments;
    pause: DebugProtocol.PauseArguments;
    restart: DebugProtocol.RestartArguments;
    restartFrame: DebugProtocol.RestartFrameArguments;
    reverseContinue: DebugProtocol.ReverseContinueArguments;
    scopes: DebugProtocol.ScopesArguments;
    setBreakpoints: DebugProtocol.SetBreakpointsArguments;
    setExceptionBreakpoints: DebugProtocol.SetExceptionBreakpointsArguments;
    setExpression: DebugProtocol.SetExpressionArguments;
    setFunctionBreakpoints: DebugProtocol.SetFunctionBreakpointsArguments;
    setVariable: DebugProtocol.SetVariableArguments;
    source: DebugProtocol.SourceArguments;
    stackTrace: DebugProtocol.StackTraceArguments;
    stepBack: DebugProtocol.StepBackArguments;
    stepIn: DebugProtocol.StepInArguments;
    stepInTargets: DebugProtocol.StepInTargetsArguments;
    stepOut: DebugProtocol.StepOutArguments;
    terminate: DebugProtocol.TerminateArguments;
    terminateThreads: DebugProtocol.TerminateThreadsArguments;
    threads: {};
    updateCell: IUpdateCellArguments;
  }

  /**
   * Interface for all the debug response types.
   */
  export interface IDebugResponseTypes {
    attach: DebugProtocol.AttachResponse;
    completions: DebugProtocol.CompletionsResponse;
    configurationDone: DebugProtocol.ConfigurationDoneResponse;
    continue: DebugProtocol.ContinueResponse;
    disconnect: DebugProtocol.DisconnectResponse;
    evaluate: DebugProtocol.EvaluateResponse;
    exceptionInfo: DebugProtocol.ExceptionInfoResponse;
    goto: DebugProtocol.GotoResponse;
    gotoTargets: DebugProtocol.GotoTargetsResponse;
    initialize: DebugProtocol.InitializeResponse;
    launch: DebugProtocol.LaunchResponse;
    loadedSources: DebugProtocol.LoadedSourcesResponse;
    modules: DebugProtocol.ModulesResponse;
    next: DebugProtocol.NextResponse;
    pause: DebugProtocol.PauseResponse;
    restart: DebugProtocol.RestartResponse;
    restartFrame: DebugProtocol.RestartFrameResponse;
    reverseContinue: DebugProtocol.ReverseContinueResponse;
    scopes: DebugProtocol.ScopesResponse;
    setBreakpoints: DebugProtocol.SetBreakpointsResponse;
    setExceptionBreakpoints: DebugProtocol.SetExceptionBreakpointsResponse;
    setExpression: DebugProtocol.SetExpressionResponse;
    setFunctionBreakpoints: DebugProtocol.SetFunctionBreakpointsResponse;
    setVariable: DebugProtocol.SetVariableResponse;
    source: DebugProtocol.SourceResponse;
    stackTrace: DebugProtocol.StackTraceResponse;
    stepBack: DebugProtocol.StepBackResponse;
    stepIn: DebugProtocol.StepInResponse;
    stepInTargets: DebugProtocol.StepInTargetsResponse;
    stepOut: DebugProtocol.StepOutResponse;
    terminate: DebugProtocol.TerminateResponse;
    terminateThreads: DebugProtocol.TerminateThreadsResponse;
    threads: DebugProtocol.ThreadsResponse;
    updateCell: IUpdateCellResponse;
    variables: DebugProtocol.VariablesResponse;
  }
}
