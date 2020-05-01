// Copyright (c) Jupyter Development Team.

import 'jest';

import { UUID } from '@lumino/coreutils';

import { toArray } from '@lumino/algorithm';

import {
  ServerConnection,
  SessionManager,
  Session,
  SessionAPI,
  KernelManager
} from '../../src';

import {
  testEmission,
  JupyterServer,
  flakyIt as it
} from '@jupyterlab/testutils';

/**
 * Start a new session on with a default name.
 */
async function startNew(
  manager: SessionManager
): Promise<Session.ISessionConnection> {
  const session = await manager.startNew({
    path: UUID.uuid4(),
    name: UUID.uuid4(),
    type: 'MYTEST'
  });
  return session;
}

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('session/manager', () => {
  let kernelManager: KernelManager;
  let manager: SessionManager;
  let session: Session.ISessionConnection;

  beforeAll(() => {
    jest.setTimeout(20000);
    kernelManager = new KernelManager({ standby: 'never' });
  });

  beforeEach(async () => {
    manager = new SessionManager({ kernelManager, standby: 'never' });
    await manager.ready;
    session = await startNew(manager);
    await session.kernel!.info;
  });

  afterEach(() => {
    manager.dispose();
  });

  afterAll(async () => {
    const sessions = await SessionAPI.listRunning();
    await Promise.all(sessions.map(s => SessionAPI.shutdownSession(s.id)));
  });

  describe('SessionManager', () => {
    describe('#constructor()', () => {
      it('should create a new session manager', () => {
        expect(manager instanceof SessionManager).toBe(true);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', async () => {
        manager.dispose();
        const serverSettings = ServerConnection.makeSettings();
        const token = serverSettings.token;
        manager = new SessionManager({ kernelManager, serverSettings });
        await manager.ready;
        expect(manager.serverSettings.token).toBe(token);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new SessionManager({ kernelManager });
        expect(manager.isReady).toBe(false);
        await manager.ready;
        expect(manager.isReady).toBe(true);
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', async () => {
        await manager.ready;
      });
    });

    describe('#running()', () => {
      it('should get the running sessions', async () => {
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).toBeGreaterThan(0);
      });
    });

    describe('#runningChanged', () => {
      it('should be emitted when the running sessions changed', async () => {
        const promise = testEmission(manager.runningChanged, {
          test: (sender, args) => {
            expect(sender).toBe(manager);
            expect(toArray(args).length).toBeGreaterThan(0);
          }
        });
        await startNew(manager);
        await promise;
      });

      it('should be emitted when a session is shut down', async () => {
        let called = false;
        const s = await startNew(manager);
        manager.runningChanged.connect(() => {
          called = true;
        });
        await s.shutdown();
        await manager.refreshRunning();
        expect(called).toBe(true);
      });

      it('should be emitted when a session is renamed', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await session.setPath(UUID.uuid4());
        await manager.refreshRunning();
        expect(called).toBe(true);
      });

      it('should be emitted when a session changes kernels', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await session.changeKernel({ name: session.kernel!.name });
        await manager.refreshRunning();
        expect(called).toBe(true);
      });
    });

    describe('#refreshRunning()', () => {
      // Sometimes there is an extra kernel_info_request, which means that a
      // future is prematurely disposed.
      it('should refresh the list of session ids', async () => {
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).toBeGreaterThan(0);
      });
    });

    describe('#startNew()', () => {
      it('should start a session', async () => {
        const session = await startNew(manager);
        expect(session.id).toBeTruthy();
        return session.shutdown();
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await startNew(manager);
        expect(called).toBe(true);
      });
    });

    describe('#findByPath()', () => {
      it('should find an existing session by path', async () => {
        const newModel = await manager.findByPath(session.path);
        expect(newModel!.id).toBe(session.id);
      });
    });

    describe('#findById()', () => {
      it('should find an existing session by id', async () => {
        const newModel = await manager.findById(session.id);
        expect(newModel!.id).toBe(session.id);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to a running session', () => {
        const newSession = manager.connectTo({ model: session.model });
        expect(newSession.id).toBe(session.id);
        expect(newSession.kernel!.id).toBe(session.kernel!.id);
        expect(newSession).not.toBe(session);
        expect(newSession.kernel).not.toBe(session.kernel);
      });
    });

    describe('shutdown()', () => {
      it('should shut down a session by id', async () => {
        const temp = await startNew(manager);
        await manager.shutdown(temp.id);
        expect(temp.isDisposed).toBe(true);
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        const session = await startNew(manager);
        manager.runningChanged.connect((sender, sessions) => {
          // Make sure the sessions list does not have our shutdown session in it.
          if (!sessions.find(s => s.id === session.id)) {
            called = true;
          }
        });

        await manager.shutdown(session.id);
        expect(called).toBe(true);
        expect(session.isDisposed).toBe(true);
      });

      it('should dispose of all session instances asynchronously', async () => {
        const session0 = await startNew(manager);
        const session1 = manager.connectTo({ model: session0.model });
        const emission = testEmission(session1.disposed);
        await session0.shutdown();
        await emission;
      });
    });
  });
});
