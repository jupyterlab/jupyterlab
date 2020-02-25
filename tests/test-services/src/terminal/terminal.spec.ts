// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PageConfig } from '@jupyterlab/coreutils';

import { Terminal, TerminalManager } from '@jupyterlab/services';

import { testEmission } from '@jupyterlab/testutils';

import { handleRequest } from '../utils';

describe('terminal', () => {
  let defaultSession: Terminal.ITerminalConnection;
  let session: Terminal.ITerminalConnection;
  let manager = new TerminalManager();

  beforeAll(async () => {
    defaultSession = await manager.startNew();
  });

  afterEach(async () => {
    if (session) {
      await session.shutdown();
    }
  });

  describe('Terminal', () => {
    describe('.isAvailable()', () => {
      it('should test whether terminal sessions are available', () => {
        expect(Terminal.isAvailable()).to.equal(true);
      });
    });
  });

  describe('.ITerminalConnection', () => {
    describe('#messageReceived', () => {
      it('should be emitted when a message is received', async () => {
        session = await manager.startNew();
        let emission = testEmission(session.messageReceived, {
          test: (sender, msg) => {
            return msg.type === 'stdout';
          }
        });
        session.send({ type: 'stdin', content: ['cd\r'] });
        await emission;
      });
    });

    describe('#name', () => {
      it('should be the name of the session', () => {
        expect(defaultSession.name).to.be.ok;
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings of the server', () => {
        expect(defaultSession.serverSettings.baseUrl).to.equal(
          PageConfig.getBaseUrl()
        );
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the object is disposed', async () => {
        session = await manager.startNew();
        const name = session.name;
        expect(session.isDisposed).to.equal(false);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await manager.shutdown(name);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the session', async () => {
        session = await manager.startNew();
        const name = session.name;
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await manager.shutdown(name);
      });

      it('should be safe to call more than once', async () => {
        session = await manager.startNew();
        const name = session.name;
        session.dispose();
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await manager.shutdown(name);
      });
    });

    describe('#send()', () => {
      it('should send a message to the socket', async () => {
        session.send({ type: 'stdin', content: [1, 2] });
      });
    });

    describe('#reconnect()', () => {
      it('should reconnect to the socket', async () => {
        const session = await manager.startNew();
        const promise = session.reconnect();
        expect(session.connectionStatus).to.equal('connecting');
        await promise;
        expect(session.connectionStatus).to.equal('connected');
      });
    });

    describe('#shutdown()', () => {
      it('should shut down the terminal session', async () => {
        session = await manager.startNew();
        await session.shutdown();
      });

      it('should handle a 404 status', () => {
        handleRequest(defaultSession, 404, {});
        return defaultSession.shutdown();
      });
    });
  });
});
