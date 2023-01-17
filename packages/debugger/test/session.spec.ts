// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Session } from '@jupyterlab/services';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import { JupyterServer, signalToPromises } from '@jupyterlab/testing';

import { find } from '@lumino/algorithm';

import { PromiseDelegate, UUID } from '@lumino/coreutils';

import { DebugProtocol } from '@vscode/debugprotocol';

import { Debugger } from '../src/debugger';

import { IDebugger } from '../src/tokens';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('Debugger.Session', () => {
  let connection: Session.ISessionConnection;
  let config: IDebugger.IConfig;

  beforeEach(async () => {
    const path = UUID.uuid4();
    config = new Debugger.Config();
    connection = await createSession({
      name: '',
      type: 'test',
      path
    });
    await connection.changeKernel({ name: 'python3' });
  });

  afterEach(async () => {
    await connection.shutdown();
  });

  describe('#isDisposed', () => {
    it('should return whether the object is disposed', () => {
      const debugSession = new Debugger.Session({
        connection,
        config
      });
      expect(debugSession.isDisposed).toEqual(false);
      debugSession.dispose();
      expect(debugSession.isDisposed).toEqual(true);
    });
  });

  describe('#eventMessage', () => {
    it('should be emitted when sending debug messages', async () => {
      const debugSession = new Debugger.Session({
        connection,
        config
      });
      let events: string[] = [];
      debugSession.eventMessage.connect((sender, event) => {
        events.push(event.event);
      });
      await debugSession.start();
      await debugSession.stop();
      expect(events).toEqual(
        expect.arrayContaining(['output', 'initialized', 'process'])
      );
    });
  });

  describe('#sendRequest success', () => {
    it('should send debug messages to the kernel', async () => {
      const debugSession = new Debugger.Session({
        connection,
        config
      });
      await debugSession.start();
      const code = 'i=0\ni+=1\ni+=1';
      const reply = await debugSession.sendRequest('dumpCell', {
        code
      });
      await debugSession.stop();
      expect(reply.body.sourcePath).toContain('.py');
    });
  });

  describe('#sendRequest failure', () => {
    it('should handle replies with success false', async () => {
      const debugSession = new Debugger.Session({
        connection,
        config
      });
      await debugSession.start();
      const reply = await debugSession.sendRequest('evaluate', {
        expression: 'a'
      });
      await debugSession.stop();
      const { success, message } = reply;
      expect(success).toBe(false);
      expect(message).toBeTruthy();
    });
  });
});

describe('protocol', () => {
  const code = [
    'i = 0',
    'i += 1',
    'i += 1',
    'j = i**2',
    'j += 1',
    'print(i, j)',
    'for i in range(10):',
    '    j = i ** 2',
    '    print(j)',
    'print(j)'
  ].join('\n');

  const breakpoints: DebugProtocol.SourceBreakpoint[] = [
    { line: 3 },
    { line: 5 }
  ];

  let connection: Session.ISessionConnection;
  let config: IDebugger.IConfig;
  let debugSession: Debugger.Session;
  let threadId = 1;

  beforeEach(async () => {
    const path = UUID.uuid4();
    config = new Debugger.Config();
    connection = await createSession({
      name: '',
      type: 'test',
      path
    });
    await connection.changeKernel({ name: 'python3' });
    debugSession = new Debugger.Session({
      connection,
      config
    });
    await debugSession.start();

    const stoppedFuture = new PromiseDelegate<void>();
    debugSession.eventMessage.connect(
      (sender: Debugger.Session, event: IDebugger.ISession.Event) => {
        switch (event.event) {
          case 'thread': {
            const msg = event as DebugProtocol.ThreadEvent;
            threadId = msg.body.threadId;
            break;
          }
          case 'stopped': {
            const msg = event as DebugProtocol.StoppedEvent;
            threadId = msg.body.threadId!;
            stoppedFuture.resolve();
            break;
          }
          default:
            break;
        }
      }
    );

    const reply = await debugSession.sendRequest('dumpCell', {
      code
    });
    await debugSession.sendRequest('setBreakpoints', {
      breakpoints,
      source: { path: reply.body.sourcePath },
      sourceModified: false
    });
    await debugSession.sendRequest('configurationDone', {});

    // trigger an execute_request
    connection!.kernel!.requestExecute({ code });

    // wait for the first stopped event
    await stoppedFuture.promise;
  }, 30000);

  afterEach(async () => {
    await debugSession.stop();
    debugSession.dispose();
    await connection.shutdown();
    connection.dispose();
  }, 30000);

  describe('#debugInfo', () => {
    it('should return the state of the current debug session', async () => {
      const reply = await debugSession.sendRequest('debugInfo', {});
      expect(reply.body.isStarted).toBe(true);

      const breakpoints = reply.body.breakpoints;
      // breakpoints are in the same file
      expect(breakpoints.length).toEqual(1);

      const breakpointsInfo = breakpoints[0];
      const breakpointLines = breakpointsInfo.breakpoints.map(bp => {
        return bp.line;
      });
      expect(breakpointLines).toEqual([3, 5]);
    });
  });

  describe('#stackTrace', () => {
    it('should return the correct stackframes', async () => {
      const reply = await debugSession.sendRequest('stackTrace', {
        threadId
      });
      expect(reply.success).toBe(true);
      const stackFrames = reply.body.stackFrames;
      expect(stackFrames.length).toEqual(1);
      const frame = stackFrames[0];
      // first breakpoint
      expect(frame.line).toEqual(3);
    });
  });

  describe('#scopes', () => {
    it('should return the correct scopes', async () => {
      const stackFramesReply = await debugSession.sendRequest('stackTrace', {
        threadId
      });
      const frameId = stackFramesReply.body.stackFrames[0].id;
      const scopesReply = await debugSession.sendRequest('scopes', {
        frameId
      });
      const scopes = scopesReply.body.scopes;
      expect(scopes.length).toBeGreaterThanOrEqual(1);

      const locals = scopes.find(scope => scope.name === 'Locals');
      expect(locals).toBeTruthy();
    });
  });

  const getVariables = async (
    start?: number,
    count?: number
  ): Promise<DebugProtocol.Variable[]> => {
    const stackFramesReply = await debugSession.sendRequest('stackTrace', {
      threadId
    });
    const frameId = stackFramesReply.body.stackFrames[0].id;
    const scopesReply = await debugSession.sendRequest('scopes', {
      frameId
    });
    const scopes = scopesReply.body.scopes;
    const variablesReference = scopes[0].variablesReference;
    const variablesReply = await debugSession.sendRequest('variables', {
      variablesReference,
      start,
      count
    });
    return variablesReply.body.variables;
  };

  describe('#variables', () => {
    it('should return the variables and their values', async () => {
      const variables = await getVariables();
      expect(variables.length).toBeGreaterThan(0);
      const i = find(variables, variable => variable.name === 'i');
      expect(i).toBeDefined();
      expect(i!.type).toEqual('int');
      expect(i!.value).toEqual('1');
    });
  });

  describe('#variablesPagination', () => {
    it.skip('should return the amount of variables requested', async () => {
      await debugSession.sendRequest('continue', { threadId });
      const variables = await getVariables(1, 1);
      const integers = variables.filter(variable => variable.type === 'int');
      expect(integers).toBeDefined();
      expect(integers.length).toEqual(1);
    });
  });

  describe('#continue', () => {
    it('should proceed to the next breakpoint', async () => {
      const [first, second] = signalToPromises(debugSession.eventMessage, 2);
      await debugSession.sendRequest('continue', { threadId });

      // wait for debug events
      const [, continued] = await first;
      expect(continued.event).toEqual('continued');
      const [, stopped] = await second;
      expect(stopped.event).toEqual('stopped');

      const variables = await getVariables();
      const i = find(variables, variable => variable.name === 'i');
      expect(i).toBeDefined();
      expect(i!.type).toEqual('int');
      expect(i!.value).toEqual('2');

      const j = find(variables, variable => variable.name === 'j');
      expect(j).toBeDefined();
      expect(j!.type).toEqual('int');
      expect(j!.value).toEqual('4');
    });
  });

  describe('#source', () => {
    it('should retrieve the source of the dumped code cell', async () => {
      const stackFramesReply = await debugSession.sendRequest('stackTrace', {
        threadId
      });
      const frame = stackFramesReply.body.stackFrames[0];
      const source = frame.source;
      const reply = await debugSession.sendRequest('source', {
        source: { path: source!.path! },
        sourceReference: source!.sourceReference!
      });
      const sourceCode = reply.body.content;
      expect(sourceCode).toEqual(code);
    });
  });

  describe('#evaluate', () => {
    it('should evaluate the code sent to the kernel', async () => {
      const stackFramesReply = await debugSession.sendRequest('stackTrace', {
        threadId
      });
      const frameId = stackFramesReply.body.stackFrames[0].id;
      const reply = await debugSession.sendRequest('evaluate', {
        frameId,
        context: 'repl',
        expression: 'k = 123',
        format: {}
      });
      expect(reply.success).toBe(true);

      const variables = await getVariables();
      const k = find(variables, variable => variable.name === 'k');
      expect(k).toBeDefined();
      expect(k!.type).toEqual('int');
      expect(k!.value).toEqual('123');
    });
  });

  describe('#setBreakpoints with condition', () => {
    it('should be hit when the condition is true', async () => {
      const reply = await debugSession.sendRequest('dumpCell', {
        code
      });
      await debugSession.sendRequest('setBreakpoints', {
        breakpoints: [{ line: 9, condition: 'i == 5' }],
        source: { path: reply.body.sourcePath },
        sourceModified: false
      });
      await debugSession.sendRequest('configurationDone', {});

      // advance to the conditional breakpoint
      await debugSession.sendRequest('continue', { threadId });

      const variables = await getVariables();
      const j = find(variables, variable => variable.name === 'j');
      expect(j).toBeDefined();
      expect(j!.value).toEqual('25');
    });
  });
});
