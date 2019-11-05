// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { Session } from '@jupyterlab/services';

import { Token } from '@phosphor/coreutils';

import { IDisposable, IObservableDisposable } from '@phosphor/disposable';

import { ISignal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

// TODO: remove that import when an interface has
// been created for Model class
import { Breakpoints } from './breakpoints';
import { Debugger } from './debugger';

/**
 * An interface describing an application's visual debugger.
 */
export interface IDebugger extends IDisposable {
  /**
   * The mode of the debugger UI.
   *
   * #### Notes
   * There is only ever one debugger instance. If it is `expanded`, it exists
   * as a `MainAreaWidget`, otherwise it is a sidebar.
   */
  mode: IDebugger.Mode;

  /**
   * The current debugger session.
   */
  session: IDebugger.ISession;

  /**
   * The model of the debugger.
   */
  model: Debugger.Model;

  /**
   * Signal emitted upon session changed.
   */
  readonly sessionChanged: ISignal<IDebugger, IDebugger.ISession>;

  /**
   * Signal emitted upon model changed.
   */
  readonly modelChanged: ISignal<IDebugger, Debugger.Model>;

  /**
   * Signal emitted for debug event messages.
   */
  readonly eventMessage: ISignal<IDebugger, IDebugger.ISession.Event>;

  /**
   * Whether the debugger can start.
   */
  canStart(): boolean;

  /**
   * Whether the current debugger is started.
   */
  isStarted(): boolean;

  /**
   * Whether the current thread is stopped.
   */
  isThreadStopped(): boolean;

  /**
   * Starts a debugger.
   * Precondition: canStart() && !isStarted()
   */
  start(): Promise<void>;

  /**
   * Stops the debugger.
   * Precondition: isStarted()
   */
  stop(): Promise<void>;

  /**
   * Continues the execution of the current thread.
   */
  continue(): Promise<void>;

  /**
   * Makes the current thread run again for one step.
   */
  next(): Promise<void>;

  /**
   * Makes the current thread step in a function / method if possible.
   */
  stepIn(): Promise<void>;

  /**
   * Makes the current thread step out a function / method if possible.
   */
  stepOut(): Promise<void>;

  /**
   * Update all breakpoints at once.
   */
  updateBreakpoints(breakpoints: Breakpoints.IBreakpoint[]): Promise<void>;
}

/**
 * A namespace for visual debugger types.
 */
export namespace IDebugger {
  /**
   * The mode of the debugger UI.
   */
  export type Mode = 'condensed' | 'expanded';

  /**
   * A visual debugger session.
   */
  export interface ISession extends IObservableDisposable {
    /**
     * The API client session to connect to a debugger.
     */
    client: IClientSession | Session.ISession;

    /**
     * Whether the debug session is started
     */
    readonly isStarted: boolean;
    /**
     * Signal emitted for debug event messages.
     */
    readonly eventMessage: ISignal<
      IDebugger.ISession,
      IDebugger.ISession.Event
    >;

    /**
     * Start a new debug session.
     */
    start(): Promise<void>;

    /**
     * Stop a running debug session.
     */
    stop(): Promise<void>;

    /**
     * Restore the state of a debug session.
     */
    restoreState(): Promise<void>;

    /**
     * Send a debug request to the kernel.
     */
    sendRequest<K extends keyof IDebugger.ISession.Request>(
      command: K,
      args: IDebugger.ISession.Request[K]
    ): Promise<IDebugger.ISession.Response[K]>;
  }

  export namespace ISession {
    /**
     * Arguments for 'dumpCell' request.
     * This is an addition to the Debug Adapter Protocol to support
     * setting breakpoints for cells.
     */
    export interface IDumpCellArguments {
      code: string;
    }

    /**
     * Response to 'dumpCell' request.
     * This is an addition to the Debug Adapter Protocol to support
     * setting breakpoints for cells.
     */
    export interface IDumpCellResponse extends DebugProtocol.Response {
      body: {
        sourcePath: string;
      };
    }

    /**
     * List of breakpoints in a source file.
     */
    export interface IDebugInfoBreakpoints {
      source: string;
      lines: number[];
    }

    /**
     * Response to 'debugInfo' request.
     * This is an addition to the Debug Adapter Protocol to be able
     * to retrieve the debugger state when restoring a session.
     */
    export interface IDebugInfoResponse extends DebugProtocol.Response {
      body: {
        isStarted: boolean;
        hashMethod: string;
        hashSeed: number;
        breakpoints: IDebugInfoBreakpoints[];
      };
    }

    /**
     * Expose all the debug requests types.
     */
    export type Request = {
      attach: DebugProtocol.AttachRequestArguments;
      completions: DebugProtocol.CompletionsArguments;
      configurationDone: DebugProtocol.ConfigurationDoneArguments;
      continue: DebugProtocol.ContinueArguments;
      debugInfo: {};
      disconnect: DebugProtocol.DisconnectArguments;
      dumpCell: IDumpCellArguments;
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
      variables: DebugProtocol.VariablesArguments;
    };

    /**
     * Expose all the debug response types.
     */
    export type Response = {
      attach: DebugProtocol.AttachResponse;
      completions: DebugProtocol.CompletionsResponse;
      configurationDone: DebugProtocol.ConfigurationDoneResponse;
      continue: DebugProtocol.ContinueResponse;
      debugInfo: IDebugInfoResponse;
      disconnect: DebugProtocol.DisconnectResponse;
      dumpCell: IDumpCellResponse;
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
      variables: DebugProtocol.VariablesResponse;
    };

    /**
     * A generic debug event.
     */
    export type Event = DebugProtocol.Event;
  }
}

/**
 * A token for a tracker for an application's visual debugger instances.
 */
export const IDebugger = new Token<IDebugger>('@jupyterlab/debugger');
