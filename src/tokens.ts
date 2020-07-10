// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { KernelMessage, Session } from '@jupyterlab/services';

import { IIterator } from '@lumino/algorithm';

import { Token } from '@lumino/coreutils';

import { IObservableDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

/**
 * An interface describing an application's visual debugger.
 */
export interface IDebugger {
  /**
   * The current debugger session.
   */
  session: IDebugger.ISession;

  /**
   * The model of the debugger.
   */
  model: IDebugger.IModel;

  /**
   * Whether the current debugger is started.
   */
  readonly isStarted: boolean;

  /**
   * Signal emitted upon session changed.
   */
  readonly sessionChanged: ISignal<IDebugger, IDebugger.ISession>;

  /**
   * Signal emitted upon model changed.
   */
  readonly modelChanged: ISignal<IDebugger, IDebugger.IModel>;

  /**
   * Signal emitted for debug event messages.
   */
  readonly eventMessage: ISignal<IDebugger, IDebugger.ISession.Event>;

  /**
   * Request whether debugging is available for the given session connection.
   *
   * @param connection The session connection.
   */
  isAvailable(connection: Session.ISessionConnection): Promise<boolean>;

  /**
   * Computes an id based on the given code.
   */
  getCodeId(code: string): string;

  /**
   * Whether there exist a thread in stopped state.
   */
  hasStoppedThreads(): boolean;

  /**
   * Starts a debugger.
   * Precondition: !isStarted
   */
  start(): Promise<void>;

  /**
   * Stops the debugger.
   * Precondition: isStarted
   */
  stop(): Promise<void>;

  /**
   * Restart the debugger.
   * Precondition: isStarted
   */
  restart(): Promise<void>;

  /**
   * Restore the state of a debug session.
   *
   * @param autoStart - when true, starts the debugger
   * if it has not been started yet.
   */
  restoreState(autoStart: boolean): Promise<void>;

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
   * Update all breakpoints of a cell at once.
   *
   * @param code - The code in the cell where the breakpoints are set.
   * @param breakpoints - The list of breakpoints to set.
   * @param path - Optional path to the file where to set the breakpoints.
   */
  updateBreakpoints(
    code: string,
    breakpoints: IDebugger.IBreakpoint[],
    path?: string
  ): Promise<void>;

  /**
   * Removes all the breakpoints from the current notebook or console
   */
  clearBreakpoints(): Promise<void>;

  /**
   * Request variables for a given variable reference.
   *
   * @param variablesReference The variable reference to request.
   */
  inspectVariable(
    variablesReference: number
  ): Promise<DebugProtocol.Variable[]>;

  /**
   * Retrieve the content of a source file.
   *
   * @param source The source object containing the path to the file.
   */
  getSource(source: DebugProtocol.Source): Promise<IDebugger.ISource>;
}

/**
 * A namespace for visual debugger types.
 */
export namespace IDebugger {
  /**
   * A visual debugger session.
   */
  export interface ISession extends IObservableDisposable {
    /**
     * The API session connection to connect to a debugger.
     */
    connection: Session.ISessionConnection;

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
    restoreState(): Promise<IDebugger.ISession.Response['debugInfo']>;

    /**
     * Send a debug request to the kernel.
     */
    sendRequest<K extends keyof IDebugger.ISession.Request>(
      command: K,
      args: IDebugger.ISession.Request[K]
    ): Promise<IDebugger.ISession.Response[K]>;
  }

  /**
   * Single breakpoint in an editor.
   */
  export interface IBreakpoint extends DebugProtocol.Breakpoint {
    active: boolean;
  }
  /**
   * Debugger file and hashing configuration.
   */
  export interface IConfig {
    /**
     * Returns an id based on the given code.
     *
     * @param code The source code.
     * @param kernel The kernel name from current session.
     */
    getCodeId(code: string, kernel: string): string;

    /**
     * Sets the hash parameters for a kernel.
     *
     * @param params - Hashing parameters for a kernel.
     */
    setHashParams(params: IConfig.HashParams): void;

    /**
     * Sets the parameters used for the temp files (e.g. cells) for a kernel.
     *
     * @param params - Temporary file prefix and suffix for a kernel.
     */
    setTmpFileParams(params: IConfig.FileParams): void;
  }

  /**
   * Debugger file and hashing configuration.
   */
  export namespace IConfig {
    /**
     * Temporary file prefix and suffix for a kernel.
     */
    export type FileParams = {
      /**
       * The kernel name.
       */
      kernel: string;

      /**
       * Prefix added to temporary files created by the kernel per cell.
       */
      prefix: string;

      /**
       * Suffix added temporary files created by the kernel per cell.
       */
      suffix: string;
    };

    /**
     * Hashing parameters for a kernel.
     */
    export type HashParams = {
      /**
       * The kernel name.
       */
      kernel: string;

      /**
       * The hash method.
       */
      method: string;

      /**
       * The hash seed.
       */
      seed: number;
    };
  }

  /**
   * A utility to find text editors used by the debugger.
   */
  export interface IEditorFinder {
    /**
     * Returns an iterator of editors for a source matching the current debug
     * session by iterating through all the widgets in each of the supported
     * debugger types (i.e., consoles, files, notebooks).
     *
     * @param params - The editor search parameters.
     */
    find(params: IEditorFinder.Params): IIterator<CodeEditor.IEditor>;
  }

  /**
   * A utility to find text editors used by the debugger.
   */
  export namespace IEditorFinder {
    /**
     * Unified parameters for find method
     */
    export type Params = {
      /**
       * Extra flag prevent disable focus.
       */
      focus: boolean;

      /**
       * Name of current kernel.
       */
      kernel: string;

      /**
       * Path of session connection.
       */
      path: string;

      /**
       * Source path
       */
      source: string;
    };
  }

  /**
   * The interface for a source file.
   */
  export interface ISource {
    /**
     * The path of the source.
     */
    path: string;

    /**
     * The content of the source.
     */
    content: string;

    /**
     * The mimeType of the source.
     */
    mimeType?: string;
  }

  /**
   * The model of a debugger session.
   */
  export type IModel = IObservableDisposable;

  export namespace ISession {
    /**
     * Response to the 'kernel_info_request' request.
     * This interface extends the IInfoReply by adding the `debugger` key
     * that isn't part of the protocol yet.
     * See this pull request for more info: https://github.com/jupyter/jupyter_client/pull/486
     */
    export interface IInfoReply extends KernelMessage.IInfoReply {
      debugger: boolean;
    }

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
      breakpoints: DebugProtocol.Breakpoint[];
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
        tmpFilePrefix: string;
        tmpFileSuffix: string;
        stoppedThreads: number[];
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
 * The visual debugger token.
 */
export const IDebugger = new Token<IDebugger>('@jupyterlab/debugger');

/**
 * The debugger configuration token.
 */
export const IDebuggerConfig = new Token<IDebugger.IConfig>(
  '@jupyterlab/debugger:config'
);

/**
 * The debugger editor finder utility token.
 */
export const IDebuggerEditorFinder = new Token<IDebugger.IEditorFinder>(
  '@jupyterlab/debugger:editor-finder'
);
