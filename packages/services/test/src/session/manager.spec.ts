// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  toArray
} from '@phosphor/algorithm';

import {
  Signal
} from '@phosphor/signaling';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Kernel, ServerConnection, SessionManager, Session
} from '../../../lib';

import {
  KERNELSPECS, handleRequest
} from '../utils';


/**
 * Start a new session on with a default name.
 */
function startNew(manager: SessionManager): Promise<Session.ISession> {
  return manager.startNew({ path: uuid() });
}


describe('session/manager', () => {

  let manager: SessionManager;
  let session: Session.ISession;

  before(async () => {
    session = await Session.startNew({ path: uuid() });
    await session.kernel.ready;
  });

  beforeEach(() => {
    manager = new SessionManager();
    expect(manager.specs).to.be(null);
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
        expect(manager instanceof SessionManager).to.be(true);
      });

    });

    describe('#serverSettings', () => {

      it('should get the server settings', () => {
        manager.dispose();
        let serverSettings = ServerConnection.makeSettings();
        let token = serverSettings.token;
        manager = new SessionManager({ serverSettings });
        expect(manager.serverSettings.token).to.be(token);
      });

    });

    describe('#specs', () => {

      it('should be the kernel specs', () => {
        return manager.ready.then(() => {
          expect(manager.specs.default).to.be.ok();
        });
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', () => {
        manager.dispose();
        manager = new SessionManager();
        expect(manager.isReady).to.be(false);
        return manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
        });
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });

    });

    describe('#running()', () => {

      it('should get the running sessions', () => {
        return manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(running.length).to.be.greaterThan(0);
        });
      });

    });

    describe('#specsChanged', () => {

      it('should be emitted when the specs change', (done) => {
        let specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        manager.specsChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          if (args.default === specs.default) {
            done();
          }
        });
        manager.refreshSpecs();
      });

    });

    describe('#runningChanged', () => {

      it('should be emitted when the running sessions changed', (done) => {
        let object = {};
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(toArray(args).length).to.be.greaterThan(0);
          Signal.disconnectReceiver(object);
          done();
        }, object);
        startNew(manager).catch(done);
      });

      it('should be emitted when a session is shut down', () => {
        let called = false;
        return startNew(manager).then(s => {
          manager.runningChanged.connect(() => {
            manager.dispose();
            called = true;
          });
          return s.shutdown();
        }).then(() => {
          expect(called).to.be(true);
        });
      });

      it('should be emitted when a session is renamed', () => {
        let called = false;
        manager.runningChanged.connect(() => {
          manager.dispose();
          called = true;
        });
        return session.setPath(uuid()).then(() => {
          return manager.refreshRunning();
        }).then(() => {
          expect(called).to.be(true);
        });
      });

      it('should be emitted when a session changes kernels', () => {
        let called = false;
        manager.runningChanged.connect(() => {
          manager.dispose();
          called = true;
        });
        return session.changeKernel({ name: session.kernel.name }).then(() => {
          return manager.refreshRunning();
        }).then(() => {
          expect(called).to.be(true);
        });
      });

    });

    describe('#refreshRunning()', () => {

      // Sometimes there is an extra kernel_info_request, which means that a
      // future is prematurely disposed.
      it('should refresh the list of session ids', () => {
        return manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(running.length).to.be.greaterThan(0);
        });
      });

    });

    describe('#refreshSpecs()', () => {

      it('should refresh the specs', () => {
        let specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        return manager.refreshSpecs().then(() => {
          expect(manager.specs.default).to.be(specs.default);
        });
      });

    });

    describe('#startNew()', () => {

      it('should start a session', async () => {
        let session = await manager.startNew({ path: uuid() });
        await session.kernel.ready;
        expect(session.id).to.be.ok();
        return session.shutdown();
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        let session = await manager.startNew({ path: uuid() });
        await session.kernel.ready;
        expect(called).to.be(true);
      });

    });

    describe('#findByPath()', () => {

      it('should find an existing session by path', async () => {
        let newModel = await manager.findByPath(session.path);
        expect(newModel.id).to.be(session.id);
      });

    });


    describe('#findById()', () => {

      it('should find an existing session by id', () => {
        return manager.findById(session.id).then(newModel => {
          expect(newModel.id).to.be(session.id);
        });
      });

    });

    describe('#connectTo()', () => {

      it('should connect to a running session', () => {
        return manager.connectTo(session.model).then(newSession => {
          expect(newSession.id).to.be(session.id);
          expect(newSession.kernel.id).to.be(session.kernel.id);
          expect(newSession).to.not.be(session);
          expect(newSession.kernel).to.not.be(session.kernel);
        });
      });

    });

    describe('shutdown()', () => {

      it('should shut down a session by id', async () => {
        let temp = await startNew(manager);
        await temp.kernel.ready;
        await manager.shutdown(temp.id);
        expect(temp.isDisposed).to.be(true);
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        let session = await startNew(manager);
        await session.kernel.ready;
        manager.runningChanged.connect((sender, sessions) => {
          // Make sure the sessions list does not have our shutdown session in it.
          if (!sessions.find(s => s.id === session.id)) {
            called = true;
          }
        });

        await manager.shutdown(session.id);
        expect(called).to.be(true);
        expect(session.isDisposed).to.be(true);
      });

    });

  });

});
