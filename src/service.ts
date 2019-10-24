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

  set session(session: IDebugger.ISession) {
    if (this._session === session) {
      return;
    }
    if (this._session) {
      this._session.dispose();
    }
    this._session = session;
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

  get sessionChanged(): ISignal<IDebugger.IService, IDebugger.ISession> {
    return this._sessionChanged;
  }

  // this will change for after execute cell
  async launch(code: string): Promise<void> {
    let threadId: number = 1;
    this.frames = [];
    this.session.eventMessage.connect((_, event: IDebugger.ISession.Event) => {
      const eventName = event.event;
      if (eventName === 'thread') {
        const msg = event as DebugProtocol.ThreadEvent;
        threadId = msg.body.threadId;
      }
    });

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

    const stackFrames = await this.getFrames(threadId);

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
  }

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

  private _session: IDebugger.ISession;
  private _sessionChanged = new Signal<this, IDebugger.ISession>(this);
  private _model: Debugger.Model;
  private frames: Frame[];
}

export type Frame = {
  id: number;
  scopes: Variables.IScope[];
};
