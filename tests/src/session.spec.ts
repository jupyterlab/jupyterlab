import { expect } from 'chai';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { createClientSession } from '@jupyterlab/testutils';

import { DebugSession } from '../../lib/session';

describe('DebugSession', () => {
  let client: IClientSession;

  beforeEach(async () => {
    client = await createClientSession({
      kernelPreference: {
        name: 'python3', // TODO: replace by xpython
        language: 'python',
        shouldStart: true,
        canStart: true
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

  describe('#start()', () => {
    it('should start a new debug session', async () => {
      const debugSession = new DebugSession({ client });
      await debugSession.start();
    });
  });
});
