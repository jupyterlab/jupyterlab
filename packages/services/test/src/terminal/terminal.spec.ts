// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PageConfig } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { Signal } from '@phosphor/signaling';

import { TerminalSession } from '../../../lib/terminal';

import { handleRequest, testEmission } from '../utils';

describe('terminal', () => {
  let defaultSession: TerminalSession.ISession;
  let session: TerminalSession.ISession;

  before(async () => {
    defaultSession = await TerminalSession.startNew();
  });

  afterEach(async () => {
    if (session) {
      await session.shutdown();
    }
  });

  describe('TerminalSession', () => {
    describe('.isAvailable()', () => {
      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.equal(true);
      });
    });

    describe('.startNew()', () => {
      it('should startNew a terminal session', async () => {
        session = await TerminalSession.startNew();
        expect(session.name).to.be.ok;
      });
    });

    describe('.connectTo', () => {
      it('should give back an existing session', async () => {
        const newSession = await TerminalSession.connectTo(defaultSession.name);
        expect(newSession.name).to.equal(defaultSession.name);
        expect(newSession).to.not.equal(defaultSession);
      });

      it('should reject if the session does not exist on the server', async () => {
        try {
          await TerminalSession.connectTo(UUID.uuid4());
          throw Error('should not get here');
        } catch (e) {
          expect(e.message).to.not.equal('should not get here');
        }
      });
    });

    describe('.shutdown()', () => {
      it('should shut down a terminal session by name', async () => {
        session = await TerminalSession.startNew();
        await TerminalSession.shutdown(session.name);
      });

      it('should handle a 404 status', () => {
        return TerminalSession.shutdown('ThisTerminalDoesNotExist');
      });
    });

    describe('.listRunning()', () => {
      it('should list the running session models', async () => {
        const models = await TerminalSession.listRunning();
        expect(models.length).to.be.greaterThan(0);
      });
    });
  });

  describe('.ISession', () => {
    describe('#terminated', () => {
      it('should be emitted when the session is shut down', async () => {
        session = await TerminalSession.startNew();
        let called = false;
        session.terminated.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.be.undefined;
          called = true;
        });
        await session.shutdown();
        expect(called).to.equal(true);
      });
    });

    describe('#messageReceived', () => {
      it('should be emitted when a message is received', async () => {
        session = await TerminalSession.startNew();
        await testEmission(session.messageReceived, {
          test: (sender, msg) => {
            return msg.type === 'stdout';
          }
        });
      });
    });

    describe('#name', () => {
      it('should be the name of the session', () => {
        expect(defaultSession.name).to.be.ok;
      });
    });

    context('#serverSettings', () => {
      it('should be the server settings of the server', () => {
        expect(defaultSession.serverSettings.baseUrl).to.equal(
          PageConfig.getBaseUrl()
        );
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the object is disposed', async () => {
        session = await TerminalSession.startNew();
        const name = session.name;
        expect(session.isDisposed).to.equal(false);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await TerminalSession.shutdown(name);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the session', async () => {
        session = await TerminalSession.startNew();
        const name = session.name;
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await TerminalSession.shutdown(name);
      });

      it('should be safe to call more than once', async () => {
        session = await TerminalSession.startNew();
        const name = session.name;
        session.dispose();
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        await TerminalSession.shutdown(name);
      });
    });

    context('#isReady', () => {
      it('should test whether the terminal is ready', async () => {
        session = await TerminalSession.startNew();
        expect(session.isReady).to.equal(false);
        await session.ready;
        expect(session.isReady).to.equal(true);
      });
    });

    describe('#ready', () => {
      it('should resolve when the terminal is ready', () => {
        return defaultSession.ready;
      });
    });

    describe('#send()', () => {
      it('should send a message to the socket', async () => {
        await defaultSession.ready;
        session.send({ type: 'stdin', content: [1, 2] });
      });
    });

    describe('#reconnect()', () => {
      it('should reconnect to the socket', async () => {
        const session = await TerminalSession.startNew();
        const promise = session.reconnect();
        expect(session.isReady).to.equal(false);
        await promise;
        expect(session.isReady).to.equal(true);
      });
    });

    describe('#shutdown()', () => {
      it('should shut down the terminal session', async () => {
        session = await TerminalSession.startNew();
        await session.shutdown();
      });

      it('should handle a 404 status', () => {
        handleRequest(defaultSession, 404, {});
        return defaultSession.shutdown();
      });
    });
  });
});
