import { ISignal, Signal } from '@phosphor/signaling';

import { DebugProtocol } from 'vscode-debugprotocol';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

import { Variables } from './variables';

import { Callstack } from './callstack';

export class DebugService implements IDebugger.IService {
  constructor(debuggerModel: Debugger.Model) {
    // Avoids setting session with invalid client
    // session should be set only when a notebook or
    // a console get the focus.
    // TODO: also checks that the notebook or console
    // runs a kernel with debugging ability
    this._session = null;
    this._model = debuggerModel;
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
        void this.getFramesAllData();
      } else if (event.event === 'continued') {
        this._threadStopped.delete(event.body.threadId);
        this._model.clearLines.emit();
      }
      this._eventMessage.emit(event);
    });
    this._sessionChanged.emit(session);
  }

  get session() {
    return this._session;
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

  get sessionChanged(): ISignal<IDebugger.IService, IDebugger.ISession> {
    return this._sessionChanged;
  }

  get eventMessage(): ISignal<IDebugger.IService, IDebugger.ISession.Event> {
    return this._eventMessage;
  }

  // this will change for after execute cell
  async launch(code: string): Promise<void> {
    this.frames = [];
    const breakpoints: DebugProtocol.SourceBreakpoint[] = this.setBreakpoints();
    const reply = await this.session.sendRequest('dumpCell', {
      code
    });

    await this.session.sendRequest('setBreakpoints', {
      breakpoints: breakpoints,
      source: { path: reply.body.sourcePath },
      sourceModified: false
    });
    await this.session.sendRequest('configurationDone', {});

    this.session.client.kernel.requestExecute({ code });

    await this.getFramesAllData();
  }

  getFramesAllData = async () => {
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
        this._model.sidebar.variables.model.scopes = values;
        this._model.currentLineChanged.emit(frame.line);
      }
    });

    if (stackFrames) {
      this._model.sidebar.callstack.model.frames = stackFrames;
    }

    this._model.sidebar.callstack.model.currentFrameChanged.connect(
      this.onChangeFrame
    );
  };

  onChangeFrame = (_: Callstack.IModel, update: Callstack.IFrame) => {
    const frame = this.frames.find(ele => ele.id === update.id);
    if (frame && frame.scopes) {
      this._model.sidebar.variables.model.scopes = frame.scopes;
    }
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

  getVariables = async (scopes: DebugProtocol.Scope[]) => {
    if (!scopes || scopes.length === 0) {
      return;
    }
    const reply = await this.session.sendRequest('variables', {
      variablesReference: scopes[0].variablesReference
    });
    return reply.body.variables;
  };

  setBreakpoints = (): DebugProtocol.SourceBreakpoint[] => {
    return this._model.sidebar.breakpoints.model.breakpoints.map(breakpoint => {
      return {
        line: breakpoint.line
      };
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

  private currentThread(): number {
    // TODO: ask the model for the current thread ID
    return 1;
  }

  private _isDisposed: boolean = false;
  private _session: IDebugger.ISession;
  private _sessionChanged = new Signal<IDebugger.IService, IDebugger.ISession>(
    this
  );
  private _eventMessage = new Signal<
    IDebugger.IService,
    IDebugger.ISession.Event
  >(this);
  private _model: Debugger.Model;
  private frames: Frame[] = [];
  // TODO: move this in model
  private _threadStopped = new Set();
}

export type Frame = {
  id: number;
  scopes: Variables.IScope[];
};
