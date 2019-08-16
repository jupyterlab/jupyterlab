// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { createClientSession, sleep } from '@jupyterlab/testutils';

import { find } from '@phosphor/algorithm';

import { DebugProtocol } from 'vscode-debugprotocol';

import { IDebugger } from '../../lib/tokens';
import { DebugSession } from '../../lib/session';

describe('DebugSession', () => {
  let client: IClientSession;

  beforeEach(async () => {
    client = await createClientSession({
      kernelPreference: {
        name: 'xpython'
      }
    });
    await (client as ClientSession).initialize();
    await client.kernel.ready;
  });

  afterEach(async () => {
    await client.shutdown();
  });

  describe('#isDisposed', () => {
    it('should return whether the object is disposed', () => {
      const debugSession = new DebugSession({ client });
      expect(debugSession.isDisposed).to.equal(false);
      debugSession.dispose();
      expect(debugSession.isDisposed).to.equal(true);
    });
  });

  describe('#eventMessage', () => {
    it('should be emitted when sending debug messages', async () => {
      const debugSession = new DebugSession({ client });
      let events: string[] = [];
      debugSession.eventMessage.connect((sender, event) => {
        events.push(event.event);
      });
      await debugSession.start();
      await debugSession.stop();
      expect(events).to.deep.equal(['output', 'initialized', 'process']);
    });
  });

  describe('#sendRequest', () => {
    let debugSession: DebugSession;

    beforeEach(async () => {
      debugSession = new DebugSession({ client });
      await debugSession.start();
    });

    afterEach(async () => {
      await debugSession.stop();
      debugSession.dispose();
    });

    it('should send debug messages to the kernel', async () => {
      const code = 'i=0\ni+=1\ni+=1';
      const reply = await debugSession.sendRequest('updateCell', {
        cellId: 0,
        nextId: 1,
        code
      });
      expect(reply.body.sourcePath).to.contain('.py');
    });

    it('should handle replies with success false', async () => {
      const reply = await debugSession.sendRequest('evaluate', {
        expression: 'a'
      });
      const { success, message } = reply;
      expect(success).to.be.false;
      expect(message).to.contain('Unable to find thread for evaluation');
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
    'print(i, j)'
  ].join('\n');

  const breakpoints: DebugProtocol.SourceBreakpoint[] = [
    { line: 3 },
    { line: 5 }
  ];

  let client: IClientSession;
  let debugSession: DebugSession;
  let threadId: number = 1;

  beforeEach(async () => {
    client = await createClientSession({
      kernelPreference: {
        name: 'xpython'
      }
    });
    await (client as ClientSession).initialize();
    await client.kernel.ready;
    debugSession = new DebugSession({ client });
    await debugSession.start();

    debugSession.eventMessage.connect(
      (sender: DebugSession, event: IDebugger.ISession.Event) => {
        const eventName = event.event;
        if (eventName === 'thread') {
          const msg = event as DebugProtocol.ThreadEvent;
          threadId = msg.body.threadId;
        }
      }
    );

    const reply = await debugSession.sendRequest('updateCell', {
      cellId: 0,
      nextId: 1,
      code
    });
    await debugSession.sendRequest('setBreakpoints', {
      breakpoints,
      source: { path: reply.body.sourcePath },
      sourceModified: false
    });
    await debugSession.sendRequest('configurationDone', {});
    void debugSession.execute(code);

    // TODO: handle events instead
    await sleep(2000);
  });

  afterEach(async () => {
    await debugSession.stop();
    debugSession.dispose();
    await client.shutdown();
    client.dispose();
  });

  describe('#stackTrace', () => {
    it('should return the correct stackframes', async () => {
      const reply = await debugSession.sendRequest('stackTrace', {
        threadId
      });
      expect(reply.success).to.be.true;
      const stackFrames = reply.body.stackFrames;
      expect(stackFrames.length).to.equal(2);
      const frame = stackFrames[0];
      // first breakpoint
      expect(frame.line).to.equal(3);
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
      expect(scopes.length).to.equal(1);
      expect(scopes[0].name).to.equal('Locals');
    });
  });

  describe('#variablesReference', () => {
    it('should return the variables and their values', async () => {
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
        variablesReference
      });
      const variables = variablesReply.body.variables;
      expect(variables.length).to.be.greaterThan(0);
      const i = find(variables, variable => variable.name === 'i');
      expect(i).to.exist;
      expect(i.type).to.equal('int');
      expect(i.value).to.equal('1');
    });
  });
});
