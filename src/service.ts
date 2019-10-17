import { DebugSession } from './session';
import { IDebugger } from './tokens';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Debugger } from './debugger';
import { Variables } from './variables';

export class DebugService {
  constructor(session: DebugSession | null, debuggerModel: Debugger.Model) {
    this.session = session;
    this.model = debuggerModel;
  }

  private _session: DebugSession;
  // private _currentFrame: DebugProtocol.StackFrame;
  private model: Debugger.Model;

  set session(session: DebugSession) {
    this._session = session;
  }

  get session() {
    return this._session;
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

    const stackFrame = await this.getFrames(threadId);
    const scopes = await this.getScopes(stackFrame);
    const variables = await this.getVariables(scopes);

    this.model.sidebar.variables.model.scopes = this.convertData(
      scopes,
      variables
    );
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

  protected convertData = (
    scopes: DebugProtocol.Scope[],
    variables: DebugProtocol.Variable[]
  ): Variables.IScope[] => {
    return scopes.map(scope => {
      return {
        name: scope.name,
        variables: variables.map(variable => {
          return { ...variable, description: '' };
        })
      };
    });
  };
}
