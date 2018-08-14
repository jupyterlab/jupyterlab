// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { toArray } from '@phosphor/algorithm';

import { Signal } from '@phosphor/signaling';

import { JSONExt } from '@phosphor/coreutils';

import {
  Kernel,
  ServerConnection,
  SessionManager,
  Session
} from '../../../lib';

import { KERNELSPECS, handleRequest, testEmission } from '../utils';

/**
 * Start a new session on with a default name.
 */
function startNew(manager: SessionManager): Promise<Session.ISession> {
  return manager.startNew({ path: UUID.uuid4() });
}

describe('session/manager', () => {
  let manager: SessionManager;
  let session: Session.ISession;

  before(async () => {
    session = await Session.startNew({ path: UUID.uuid4() });
    await session.kernel.ready;
  });

  beforeEach(() => {
    manager = new SessionManager();
    expect(manager.specs).to.be.null;
  });

  afterEach(() => {
    manager.dispose();
  });

  after(() => {
    return Session.shutdownAll();
  });

  describe('SessionManager', () => {
    describe('#constructor()', () => {
      it('should create a new session manager', () => {
        expect(manager instanceof SessionManager).to.equal(true);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', () => {
        manager.dispose();
        const serverSettings = ServerConnection.makeSettings();
        const token = serverSettings.token;
        manager = new SessionManager({ serverSettings });
        expect(manager.serverSettings.token).to.equal(token);
      });
    });

    describe('#specs', () => {
      it('should be the kernel specs', async () => {
        await manager.ready;
        expect(manager.specs.default).to.be.ok;
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new SessionManager();
        expect(manager.isReady).to.equal(false);
        await manager.ready;
        expect(manager.isReady).to.equal(true);
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });
    });

    describe('#running()', () => {
      it('should get the running sessions', async () => {
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).to.be.greaterThan(0);
      });
    });

    describe('#specsChanged', () => {
      it('should be emitted when the specs change', async () => {
        const specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        let called = false;
        manager.specsChanged.connect((sender, args) => {
          expect(sender).to.equal(manager);
          if (args.default === specs.default) {
            called = true;
          }
        });
        await manager.refreshSpecs();
        expect(called).to.equal(true);
      });
    });

    describe('#runningChanged', () => {
      it('should be emitted when the running sessions changed', async () => {
        let promise = testEmission(manager.runningChanged, {
          test: (sender, args) => {
            expect(sender).to.equal(manager);
            expect(toArray(args).length).to.be.greaterThan(0);
          }
        });
        await startNew(manager);
        await promise;
      });

      it('should be emitted when a session is shut down', async () => {
        let called = false;
        const s = await startNew(manager);
        manager.runningChanged.connect(() => {
          manager.dispose();
          called = true;
        });
        await s.shutdown();
        expect(called).to.equal(true);
      });

      it('should be emitted when a session is renamed', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          manager.dispose();
          called = true;
        });
        await session.setPath(UUID.uuid4());
        await manager.refreshRunning();
        expect(called).to.equal(true);
      });

      it('should be emitted when a session changes kernels', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          manager.dispose();
          called = true;
        });
        await session.changeKernel({ name: session.kernel.name });
        await manager.refreshRunning();
        expect(called).to.equal(true);
      });
    });

    describe('#refreshRunning()', () => {
      // Sometimes there is an extra kernel_info_request, which means that a
      // future is prematurely disposed.
      it('should refresh the list of session ids', async () => {
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).to.be.greaterThan(0);
      });
    });

    describe('#refreshSpecs()', () => {
      it('should refresh the specs', async () => {
        const specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        await manager.refreshSpecs();
        expect(manager.specs.default).to.equal(specs.default);
      });
    });

    describe('#startNew()', () => {
      it('should start a session', async () => {
        const session = await manager.startNew({ path: UUID.uuid4() });
        await session.kernel.ready;
        expect(session.id).to.be.ok;
        return session.shutdown();
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        const session = await manager.startNew({ path: UUID.uuid4() });
        await session.kernel.ready;
        expect(called).to.equal(true);
      });
    });

    describe('#findByPath()', () => {
      it('should find an existing session by path', async () => {
        const newModel = await manager.findByPath(session.path);
        expect(newModel.id).to.equal(session.id);
      });
    });

    describe('#findById()', () => {
      it('should find an existing session by id', async () => {
        const newModel = await manager.findById(session.id);
        expect(newModel.id).to.equal(session.id);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to a running session', () => {
        const newSession = manager.connectTo(session.model);
        expect(newSession.id).to.equal(session.id);
        expect(newSession.kernel.id).to.equal(session.kernel.id);
        expect(newSession).to.not.equal(session);
        expect(newSession.kernel).to.not.equal(session.kernel);
      });
    });

    describe('shutdown()', () => {
      it('should shut down a session by id', async () => {
        const temp = await startNew(manager);
        await temp.kernel.ready;
        await manager.shutdown(temp.id);
        expect(temp.isDisposed).to.equal(true);
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        const session = await startNew(manager);
        await session.kernel.ready;
        manager.runningChanged.connect((sender, sessions) => {
          // Make sure the sessions list does not have our shutdown session in it.
          if (!sessions.find(s => s.id === session.id)) {
            called = true;
          }
        });

        await manager.shutdown(session.id);
        expect(called).to.equal(true);
        expect(session.isDisposed).to.equal(true);
      });
    });
  });
});
