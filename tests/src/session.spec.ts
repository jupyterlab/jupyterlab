// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { createClientSession } from '@jupyterlab/testutils';

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
      console.log(reply);
      expect(reply.body.sourcePath).to.contain('.py');
    });

    it('should handle replies with success false', async () => {
      const reply = await debugSession.sendRequest('evaluate', {
        expression: 'a'
      });
      const { success, message } = reply;
      console.log(reply);
      expect(success).to.be.false;
      expect(message).to.contain('Unable to find thread for evaluation');
    });
  });
});
