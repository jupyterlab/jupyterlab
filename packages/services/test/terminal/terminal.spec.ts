// Copyright (c) Jupyter Development Team.

import 'jest';

import { PageConfig } from '@jupyterlab/coreutils';

import { Terminal, TerminalManager } from '../../src';

import { testEmission, JupyterServer } from '@jupyterlab/testutils';

import { handleRequest } from '../utils';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('terminal', () => {
  let defaultSession: Terminal.ITerminalConnection;
  let session: Terminal.ITerminalConnection;
  let manager: TerminalManager;

  beforeAll(async () => {
    manager = new TerminalManager();
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
        expect(Terminal.isAvailable()).toBe(true);
      });
    });
  });

  describe('.ITerminalConnection', () => {
    describe('#messageReceived', () => {
      it('should be emitted when a message is received', async () => {
        session = await manager.startNew();
        const emission = testEmission(session.messageReceived, {
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
        expect(defaultSession.name).toBeTruthy();
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings of the server', () => {
        expect(defaultSession.serverSettings.baseUrl).toBe(
          PageConfig.getBaseUrl()
        );
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the object is disposed', async () => {
        session = await manager.startNew();
        const name = session.name;
        expect(session.isDisposed).toBe(false);
        session.dispose();
        expect(session.isDisposed).toBe(true);
        await manager.shutdown(name);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the session', async () => {
        session = await manager.startNew();
        const name = session.name;
        session.dispose();
        expect(session.isDisposed).toBe(true);
        await manager.shutdown(name);
      });

      it('should be safe to call more than once', async () => {
        session = await manager.startNew();
        const name = session.name;
        session.dispose();
        session.dispose();
        expect(session.isDisposed).toBe(true);
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
        expect(session.connectionStatus).toBe('connecting');
        await promise;
        expect(session.connectionStatus).toBe('connected');
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
