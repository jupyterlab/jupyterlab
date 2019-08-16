// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IClientSession,
  IWidgetTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { Token } from '@phosphor/coreutils';

import { IObservableDisposable } from '@phosphor/disposable';

import { DebugProtocol } from 'vscode-debugprotocol';

import { Debugger } from './debugger';

import { DebuggerSidebar } from './sidebar';

/**
 * An interface describing an application's visual debugger.
 */
export interface IDebugger extends IWidgetTracker<MainAreaWidget<Debugger>> {}

/**
 * A namespace for visual debugger types.
 */
export namespace IDebugger {
  /**
   * A visual debugger session.
   */
  export interface ISession extends IObservableDisposable {
    /**
     * The API client session to connect to a debugger.
     */
    client: IClientSession;

    /**
     * The code editors in a debugger session.
     */
    editors: CodeEditor.IEditor[];

    /**
     * Start a new debug session.
     */
    start(): void;

    /**
     * Stop a running debug session.
     */
    stop(): void;

    /**
     * Send a request to execute code.
     */
    execute(code: string): Promise<void>;
  }

  export namespace ISession {
    /**
     * Arguments for 'updateCell' request.
     * This is an addition to the Debug Adapter Protocol to support
     * setting breakpoints for cells
     */
    export interface IUpdateCellArguments {
      cellId: number;
      nextId: number;
      code: string;
    }

    /**
     * Response to 'updateCell' request.
     * This is an addition to the Debug Adapter Protocol to support
     * setting breakpoints for cells
     */
    export interface IUpdateCellResponse extends DebugProtocol.Response {
      body: {
        sourcePath: string;
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

/**
 * An interface describing an application's visual debugger.
 */
export interface IDebuggerSidebar extends DebuggerSidebar {}

/**
 * A token for a tracker for an application's visual debugger condensed sidebar.
 */
export const IDebuggerSidebar = new Token<IDebuggerSidebar>(
  '@jupyterlab/debugger-sidebar'
);
