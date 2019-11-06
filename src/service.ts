// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { ISignal, Signal } from '@phosphor/signaling';

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
        this._threadStopped.add(event.body.threadId);
        void this.getAllFrames();
      } else if (event.event === 'continued') {
        this._threadStopped.delete(event.body.threadId);
        this.onContinued();
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
   * Whether the current debugger is started.
   */
  isStarted(): boolean {
    return this._session !== null && this._session.isStarted;
  }

  /**
   * Whether the current thread is stopped.
   */
  isThreadStopped(): boolean {
    return this._threadStopped.has(this.currentThread());
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
   * Restore the state of a debug session.
   * @param autoStart - when true, starts the debugger
   * if it has not been started yet.
   */

  async restoreState(autoStart: boolean): Promise<void> {
    if (!this.model || !this.session) {
      return;
    }

    await this.session.restoreState();
    // TODO: restore breakpoints when the model is updated

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
      this._threadStopped.delete(this.currentThread());
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
   */
  updateBreakpoints = async (breakpoints: Breakpoints.IBreakpoint[]) => {
    if (!this.session.isStarted) {
      return;
    }
    // Workaround: this should not be called before the session has started
    await this.ensureSessionReady();
    const code = this._model.codeValue.text;
    const dumpedCell = await this.dumpCell(code);
    const sourceBreakpoints = Private.toSourceBreakpoints(breakpoints);
    const reply = await this.setBreakpoints(
      sourceBreakpoints,
      dumpedCell.sourcePath
    );
    let kernelBreakpoints = reply.body.breakpoints.map(breakpoint => {
      return {
        ...breakpoint,
        active: true,
        source: { path: this.session.client.name }
      };
    });

    // filter breakpoints with the same line number
    kernelBreakpoints = kernelBreakpoints.filter(
      (breakpoint, i, arr) =>
        arr.findIndex(el => el.line === breakpoint.line) === i
    );
    this._model.breakpointsModel.breakpoints = kernelBreakpoints;
    await this.session.sendRequest('configurationDone', {});
  };

  getAllFrames = async () => {
    const stackFrames = await this.getFrames(this.currentThread());

    stackFrames.forEach(async (frame, index) => {
      const scopes = await this.getScopes(frame);
      const variables = await this.getVariables(scopes);
      const values = this.convertScope(scopes, variables);
      this.frames.push({
        id: frame.id,
        scopes: values
      });
      if (index === 0) {
        this._model.variablesModel.scopes = values;
      }
    });

    if (stackFrames) {
      this._model.callstackModel.frames = stackFrames;
    }

    this._model.callstackModel.currentFrameChanged.connect(this.onChangeFrame);
    this._model.variablesModel.variableExpanded.connect(this.getVariable);
  };

  onChangeFrame = (_: Callstack.Model, update: Callstack.IFrame) => {
    const frame = this.frames.find(ele => ele.id === update.id);
    if (frame && frame.scopes) {
      this._model.variablesModel.scopes = frame.scopes;
    }
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
    let newVariable = { ...variable };
    reply.body.variables.forEach((ele: DebugProtocol.Variable) => {
      newVariable = { [ele.evaluateName]: ele, ...newVariable };
    });

    this._model.variablesModel.currentVariable = newVariable;

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

  private onContinued() {
    this._model.callstackModel.frames = [];
    this._model.variablesModel.scopes = [];
  }

  private currentThread(): number {
    // TODO: ask the model for the current thread ID
    return 1;
  }

  private _isDisposed: boolean = false;
  private _session: IDebugger.ISession;
  private _sessionChanged = new Signal<IDebugger, IDebugger.ISession>(this);
  private _modelChanged = new Signal<IDebugger, Debugger.Model>(this);
  private _eventMessage = new Signal<IDebugger, IDebugger.ISession.Event>(this);
  private _model: Debugger.Model;

  // TODO: remove frames from the service
  private frames: Frame[] = [];

  // TODO: move this in model
  private _threadStopped = new Set();
}

export type Frame = {
  id: number;
  scopes: Variables.IScope[];
};

namespace Private {
  export function toSourceBreakpoints(breakpoints: Breakpoints.IBreakpoint[]) {
    return breakpoints.map(breakpoint => {
      return {
        line: breakpoint.line
      };
    });
  }
}
