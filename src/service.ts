import { ISignal, Signal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

import { Variables } from './variables';

import { Callstack } from './callstack';

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

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get mode(): IDebugger.Mode {
    return this._model.mode;
  }

  set mode(mode: IDebugger.Mode) {
    this._model.mode = mode;
  }

  get model(): Debugger.Model {
    return this._model;
  }

  set model(model: Debugger.Model) {
    this._model = model;
  }

  get session(): IDebugger.ISession {
    return this._session;
  }

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

  canStart(): boolean {
    return this._session !== null && !this._session.isStarted;
  }

  isStarted(): boolean {
    return this._session !== null && this._session.isStarted;
  }

  isThreadStopped(): boolean {
    return this._threadStopped.has(this.currentThread());
  }

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

  async next(): Promise<void> {
    try {
      await this.session.sendRequest('next', {
        threadId: this.currentThread()
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  async stepIn(): Promise<void> {
    try {
      await this.session.sendRequest('stepIn', {
        threadId: this.currentThread()
      });
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  get sessionChanged(): ISignal<IDebugger, IDebugger.ISession> {
    return this._sessionChanged;
  }

  get eventMessage(): ISignal<IDebugger, IDebugger.ISession.Event> {
    return this._eventMessage;
  }

  // this will change for after execute cell
  async launch(code: string): Promise<void> {
    this.frames = [];

    const breakpoints: DebugProtocol.SourceBreakpoint[] = this.getBreakpoints();
    const dumpedCell = await this.session.sendRequest('dumpCell', {
      code
    });

    await this.setBreakpoints(breakpoints, dumpedCell.body.sourcePath);
    await this.session.sendRequest('configurationDone', {});

    this.session.client.kernel.requestExecute({ code });

    await this.getAllFrames();
    this._model.variablesModel.variableExapnded.connect(this.getVariable);
  }

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
        this._model.currentLineChanged.emit(frame.line);
      }
    });

    if (stackFrames) {
      this._model.callstackModel.frames = stackFrames;
    }

    this._model.callstackModel.currentFrameChanged.connect(this.onChangeFrame);
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
    if (!variable && variable.variablesReference !== 0) {
      return;
    }
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

  getBreakpoints = (): DebugProtocol.SourceBreakpoint[] => {
    return this._model.breakpointsModel.breakpoints.map(breakpoint => {
      return {
        line: breakpoint.line
      };
    });
  };

  setBreakpoints = async (
    breakpoints: DebugProtocol.SourceBreakpoint[],
    path: string
  ) => {
    await this.session.sendRequest('setBreakpoints', {
      breakpoints: breakpoints,
      source: { path },
      sourceModified: false
    });
  };

  updateBreakpoints = async () => {
    if (!this.session.isStarted) {
      return;
    }
    const code = this._model.codeValue.text;
    const dumpedCell = await this.dumpCell(code);
    const breakpoints = this.getBreakpoints();
    await this.setBreakpoints(breakpoints, dumpedCell.sourcePath);
    await this.session.sendRequest('configurationDone', {});
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

  private onContinued() {
    this._model.linesCleared.emit();
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
  private _eventMessage = new Signal<IDebugger, IDebugger.ISession.Event>(this);
  private _model: Debugger.Model;
  private frames: Frame[] = [];
  // TODO: move this in model
  private _threadStopped = new Set();
}

export type Frame = {
  id: number;
  scopes: Variables.IScope[];
};
