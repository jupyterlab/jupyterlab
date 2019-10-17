import { DebugSession } from './session';
import { IDebugger } from './tokens';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Debugger } from './debugger';

export class DebugService {
  constructor(session: DebugSession | null, debuggerModel: Debugger.Model) {
    this.session = session;
    this.model = debuggerModel;
  }

  private _session: DebugSession;
  // private _currentFrame: DebugProtocol.StackFrame;
  private _debuggerModel: Debugger.Model;

  set session(session: DebugSession) {
    this._session = session;
  }

  get session() {
    return this._session;
  }

  get model() {
    return this._debuggerModel;
  }

  set model(model: Debugger.Model) {
    this._debuggerModel = model;
  }

  // this will change for after execute cell
  async launch(code: string): Promise<void> {
    let threadId: number = 1;

    this.session.eventMessage.connect(
      (sender: DebugSession, event: IDebugger.ISession.Event) => {
        const eventName = event.event;
        if (eventName === 'thread') {
          const msg = event as DebugProtocol.ThreadEvent;
          threadId = msg.body.threadId;
        }
      }
    );

    const breakpoints: DebugProtocol.SourceBreakpoint[] = this.setBreakpoints();
    const reply = await this.session
      .sendRequest('dumpCell', {
        code
      })
      .catch(error => error);

    await this.session.sendRequest('setBreakpoints', {
      breakpoints: breakpoints,
      source: { path: reply.body.sourcePath },
      sourceModified: false
    });
    await this.session.sendRequest('configurationDone', {});

    this.session.client.kernel.requestExecute({ code });

    const stackFrameReply = await this.getFrames(threadId);
    const scopeReply = await this.getScopes(stackFrameReply);
    const variablesReply = await this.getVariables(scopeReply);

    console.log({ variablesReply, scopeReply, stackFrameReply });
  }

  getFrames = async (threadId: number) => {
    const reply = await this.session.sendRequest('stackTrace', {
      threadId
    });
    const stackFrames = reply.body.stackFrames;
    return stackFrames;
  };

  getScopes = async (frame: DebugProtocol.StackFrame[]) => {
    const reply = await this.session.sendRequest('scopes', {
      frameId: frame[0].id
    });
    return reply.body.scopes;
  };

  getVariables = async (scopes: DebugProtocol.Scope[]) => {
    const reply = await this.session.sendRequest('variables', {
      variablesReference: scopes[0].variablesReference
    });
    return reply.body.variables;
  };

  setBreakpoints = (): DebugProtocol.SourceBreakpoint[] => {
    return this.model.sidebar.breakpoints.model.breakpoints.map(breakpoint => {
      return {
        line: breakpoint.line
      };
    });
  };
}
