// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { ISignal, Signal } from '@phosphor/signaling';

import { murmur2 } from 'murmurhash-js';

import { DebugProtocol } from 'vscode-debugprotocol';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

import { Variables } from './variables';

import { Breakpoints } from './breakpoints';

import { Callstack } from './callstack';

/**
 * A concrete implementation of IDebugger.
 */
export class DebugService implements IDebugger {
  constructor() {
    // Avoids setting session with invalid client
    // session should be set only when a notebook or
    // a console get the focus.
    // TODO: also checks that the notebook or console
    // runs a kernel with debugging ability
    this._session = null;
    // The model will be set by the UI which can be built
    // after the service.
    this._model = null;
  }

  /**
   * Whether the debug service is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Returns the mode of the debugger UI.
   *
   * #### Notes
   * There is only ever one debugger instance. If it is `expanded`, it exists
   * as a `MainAreaWidget`, otherwise it is a sidebar.
   */
  get mode(): IDebugger.Mode {
    return this._model.mode;
  }

  /**
   * Sets the mode of the debugger UI to the given parameter.
   * @param mode - the new mode of the debugger UI.
   */
  set mode(mode: IDebugger.Mode) {
    this._model.mode = mode;
  }

  /**
   * Returns the current debug session.
   */
  get session(): IDebugger.ISession {
    return this._session;
  }

  /**
   * Sets the current debug session to the given parameter.
   * @param session - the new debugger session.
   */
  set session(session: IDebugger.ISession) {
    if (this._session === session) {
      return;
    }
    if (this._session) {
      this._session.dispose();
    }
    this._session = session;

    this._session.eventMessage.connect((_, event) => {
      if (event.event === 'stopped') {
        this._stoppedThreads.add(event.body.threadId);
        void this.getAllFrames();
      } else if (event.event === 'continued') {
        this._stoppedThreads.delete(event.body.threadId);
        this.clearModel();
        this.clearSignals();
      }
      this._eventMessage.emit(event);
    });
    this._sessionChanged.emit(session);
  }

  /**
   * Returns the debugger model.
   */
  get model(): Debugger.Model {
    return this._model;
  }

  /**
   * Sets the debugger model to the given parameter.
   * @param model - The new debugger model.
   */
  set model(model: Debugger.Model) {
    this._model = model;
    this._modelChanged.emit(model);
  }

  /**
   * Signal emitted upon session changed.
   */
  get sessionChanged(): ISignal<IDebugger, IDebugger.ISession> {
    return this._sessionChanged;
  }

  /**
   * Signal emitted upon model changed.
   */
  get modelChanged(): ISignal<IDebugger, Debugger.Model> {
    return this._modelChanged;
  }

  /**
   * Signal emitted for debug event messages.
   */
  get eventMessage(): ISignal<IDebugger, IDebugger.ISession.Event> {
    return this._eventMessage;
  }

  /**
   * Dispose the debug service.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Computes an id based on the given code.
   */
  getCellId(code: string): string {
    return this._tmpFilePrefix + this._hashMethod(code) + this._tmpFileSuffix;
  }

  /**
   * Whether the current debugger is started.
   */
  isStarted(): boolean {
    return this._session !== null && this._session.isStarted;
  }

  /**
   * Whether the current thread is stopped.
   */
  isThreadStopped(): boolean {
    return this._stoppedThreads.has(this.currentThread());
  }

  /**
   * Starts a debugger.
   * Precondition: canStart() && !isStarted()
   */
  async start(): Promise<void> {
    await this.session.start();
  }

  /**
   * Stops the debugger.
   * Precondition: isStarted()
   */
  async stop(): Promise<void> {
    await this.session.stop();
  }

  /**
   * Restarts the debugger.
   * Precondition: isStarted() and stopped.
   */
  async restart(): Promise<void> {
    const breakpoints = this.model.breakpointsModel.breakpoints;
    await this.stop();
    this.clearModel();
    this._stoppedThreads.clear();
    await this.start();

    // No need to dump the cells again, we can simply
    // resend the breakpoints to the kernel and update
    // the model.
    breakpoints.forEach(async (bp, path, _) => {
      const sourceBreakpoints = Private.toSourceBreakpoints(bp);
      await this.setBreakpoints(sourceBreakpoints, path);
    });

    this.model.breakpointsModel.restoreBreakpoints(breakpoints);
  }

  /**
   * Restore the state of a debug session.
   * @param autoStart - when true, starts the debugger
   * if it has not been started yet.
   */

  async restoreState(autoStart: boolean): Promise<void> {
    if (!this.model || !this.session) {
      return;
    }

    const reply = await this.session.restoreState();

    this.setHashParameters(reply.body.hashMethod, reply.body.hashSeed);
    this.setTmpFileParameters(
      reply.body.tmpFilePrefix,
      reply.body.tmpFileSuffix
    );

    const breakpoints = reply.body.breakpoints;
    let bpMap = new Map<string, Breakpoints.IBreakpoint[]>();
    if (breakpoints.length !== 0) {
      breakpoints.forEach((bp: IDebugger.ISession.IDebugInfoBreakpoints) => {
        bpMap.set(
          bp.source,
          bp.breakpoints.map(breakpoint => {
            return {
              ...breakpoint,
              active: true
            };
          })
        );
      });
    }
    this._model.breakpointsModel.restoreBreakpoints(bpMap);

    if (!this.isStarted() && autoStart) {
      await this.start();
    }
  }

  /**
   * Continues the execution of the current thread.
   */
  async continue(): Promise<void> {
    try {
      await this.session.sendRequest('continue', {
        threadId: this.currentThread()
      });
      this._stoppedThreads.delete(this.currentThread());
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  /**
   * Makes the current thread run again for one step.
   */
  async next(): Promise<void> {
    try {
      await this.session.sendRequest('next', {
        threadId: this.currentThread()
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  /**
   * Makes the current thread step in a function / method if possible.
   */
  async stepIn(): Promise<void> {
    try {
      await this.session.sendRequest('stepIn', {
        threadId: this.currentThread()
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  /**
   * Makes the current thread step out a function / method if possible.
   */
  async stepOut(): Promise<void> {
    try {
      await this.session.sendRequest('stepOut', {
        threadId: this.currentThread()
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  /**
   * Update all breakpoints at once.
   * @param code - The code in the cell where the breakpoints are set.
   * @param breakpoints - The list of breakpoints to set.
   */
  async updateBreakpoints(
    code: string,
    breakpoints: Breakpoints.IBreakpoint[]
  ) {
    if (!this.session.isStarted) {
      return;
    }
    // Workaround: this should not be called before the session has started
    await this.ensureSessionReady();
    const dumpedCell = await this.dumpCell(code);
    const sourceBreakpoints = Private.toSourceBreakpoints(breakpoints);
    const reply = await this.setBreakpoints(
      sourceBreakpoints,
      dumpedCell.sourcePath
    );
    let kernelBreakpoints = reply.body.breakpoints.map(breakpoint => {
      return {
        ...breakpoint,
        active: true
      };
    });

    // filter breakpoints with the same line number
    kernelBreakpoints = kernelBreakpoints.filter(
      (breakpoint, i, arr) =>
        arr.findIndex(el => el.line === breakpoint.line) === i
    );
    this._model.breakpointsModel.setBreakpoints(
      dumpedCell.sourcePath,
      kernelBreakpoints
    );
    await this.session.sendRequest('configurationDone', {});
  }

  async clearBreakpoints() {
    if (!this.session.isStarted) {
      return;
    }

    this._model.breakpointsModel.breakpoints.forEach(
      async (breakpoints, path, _) => {
        await this.setBreakpoints([], path);
      }
    );

    let bpMap = new Map<string, Breakpoints.IBreakpoint[]>();
    this._model.breakpointsModel.restoreBreakpoints(bpMap);
  }

  getAllFrames = async () => {
    this._model.callstackModel.currentFrameChanged.connect(this.onChangeFrame);
    this._model.variablesModel.variableExpanded.connect(this.getVariable);

    const stackFrames = await this.getFrames(this.currentThread());
    this._model.callstackModel.frames = stackFrames;
  };

  onChangeFrame = async (_: Callstack.Model, frame: Callstack.IFrame) => {
    if (!frame) {
      return;
    }
    const scopes = await this.getScopes(frame);
    const variables = await this.getVariables(scopes);
    const variableScopes = this.convertScope(scopes, variables);
    this._model.variablesModel.scopes = variableScopes;
  };

  dumpCell = async (code: string) => {
    const reply = await this.session.sendRequest('dumpCell', { code });
    return reply.body;
  };

  getFrames = async (threadId: number) => {
    const reply = await this.session.sendRequest('stackTrace', {
      threadId
    });
    const stackFrames = reply.body.stackFrames;
    return stackFrames;
  };

  getScopes = async (frame: DebugProtocol.StackFrame) => {
    if (!frame) {
      return;
    }
    const reply = await this.session.sendRequest('scopes', {
      frameId: frame.id
    });
    return reply.body.scopes;
  };

  getVariable = async (_: any, variable: DebugProtocol.Variable) => {
    const reply = await this.session.sendRequest('variables', {
      variablesReference: variable.variablesReference
    });
    let newVariable = { ...variable, expanded: true };

    reply.body.variables.forEach((variable: DebugProtocol.Variable) => {
      newVariable = { [variable.name]: variable, ...newVariable };
    });

    const newScopes = this._model.variablesModel.scopes.map(scope => {
      const findIndex = scope.variables.findIndex(
        ele => ele.variablesReference === variable.variablesReference
      );
      scope.variables[findIndex] = newVariable;
      return { ...scope };
    });

    this._model.variablesModel.scopes = [...newScopes];

    return reply.body.variables;
  };

  getVariables = async (scopes: DebugProtocol.Scope[]) => {
    if (!scopes || scopes.length === 0) {
      return;
    }
    const reply = await this.session.sendRequest('variables', {
      variablesReference: scopes[0].variablesReference
    });
    return reply.body.variables;
  };

  setBreakpoints = async (
    breakpoints: DebugProtocol.SourceBreakpoint[],
    path: string
  ) => {
    // Workaround: this should not be called before the session has started
    await this.ensureSessionReady();
    return await this.session.sendRequest('setBreakpoints', {
      breakpoints: breakpoints,
      source: { path },
      sourceModified: false
    });
  };

  protected convertScope = (
    scopes: DebugProtocol.Scope[],
    variables: DebugProtocol.Variable[]
  ): Variables.IScope[] => {
    if (!variables || !scopes) {
      return;
    }
    return scopes.map(scope => {
      return {
        name: scope.name,
        variables: variables.map(variable => {
          return { ...variable };
        })
      };
    });
  };

  private async ensureSessionReady(): Promise<void> {
    const client = this.session.client as IClientSession;
    return client.ready;
  }

  private clearModel() {
    this._model.callstackModel.frames = [];
    this._model.variablesModel.scopes = [];
  }

  private clearSignals() {
    this._model.callstackModel.currentFrameChanged.disconnect(
      this.onChangeFrame
    );
    this._model.variablesModel.variableExpanded.disconnect(this.getVariable);
  }

  private currentThread(): number {
    // TODO: ask the model for the current thread ID
    return 1;
  }

  private setHashParameters(method: string, seed: number) {
    if (method === 'Murmur2') {
      this._hashMethod = (code: string) => {
        return murmur2(code, seed).toString();
      };
    } else {
      throw new Error('hash method not supported ' + method);
    }
  }

  private setTmpFileParameters(prefix: string, suffix: string) {
    this._tmpFilePrefix = prefix;
    this._tmpFileSuffix = suffix;
  }

  private _isDisposed: boolean = false;
  private _session: IDebugger.ISession;
  private _sessionChanged = new Signal<IDebugger, IDebugger.ISession>(this);
  private _modelChanged = new Signal<IDebugger, Debugger.Model>(this);
  private _eventMessage = new Signal<IDebugger, IDebugger.ISession.Event>(this);
  private _model: Debugger.Model;

  private _hashMethod: (code: string) => string;
  private _tmpFilePrefix: string;
  private _tmpFileSuffix: string;

  // TODO: move this in model
  private _stoppedThreads = new Set();
}

namespace Private {
  export function toSourceBreakpoints(breakpoints: Breakpoints.IBreakpoint[]) {
    return breakpoints.map(breakpoint => {
      return {
        line: breakpoint.line
      };
    });
  }
}
