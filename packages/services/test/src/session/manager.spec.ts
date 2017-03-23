// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Kernel
} from '../../../lib/kernel';

import {
  SessionManager, Session
} from '../../../lib/session';

import {
  uuid, copy
} from '../../../lib/utils';

import {
  KernelTester, KERNELSPECS
} from '../utils';


/**
 * Create a unique session id.
 */
function createSessionModel(id = ''): Session.IModel {
  return {
    id: id || uuid(),
    notebook: { path: uuid() },
    kernel: { id: uuid(), name: uuid() }
  };
}


describe('session/manager', () => {

  let tester: KernelTester;
  let session: Session.ISession;
  let manager: SessionManager;
  let data: Session.IModel[];

  beforeEach((done) => {
    data = [createSessionModel(), createSessionModel()];
    tester = new KernelTester();
    tester.runningSessions = data;
    manager = new SessionManager();
    expect(manager.specs).to.be(null);
    expect(manager.running().next()).to.be(void 0);
    manager.ready.then(done, done);
  });

  afterEach((done) => {
    manager.ready.then(() => {
      manager.dispose();
      if (session) {
        session.dispose();
      }
      tester.dispose();
      done();
    }).catch(done);
  });

  describe('SessionManager', () => {

    describe('#constructor()', () => {

      it('should create a new session manager', () => {
        expect(manager instanceof SessionManager).to.be(true);
      });

    });

    describe('#baseUrl', () => {

      it('should get the base url of the server', () => {
        manager.dispose();
        manager = new SessionManager({ baseUrl: 'foo' });
        expect(manager.baseUrl).to.be('foo');
      });

    });

    describe('#wsUrl', () => {

      it('should get the ws url of the server', () => {
        manager.dispose();
        manager = new SessionManager({ wsUrl: 'bar' });
        expect(manager.wsUrl).to.be('bar');
      });

    });

    describe('#ajaxSettings', () => {

      it('should get the ajax sessions of the server', () => {
        manager.dispose();
        let ajaxSettings = { withCredentials: true };
        manager = new SessionManager({ ajaxSettings });
        expect(manager.ajaxSettings).to.eql(ajaxSettings);
      });

    });

    describe('#specs', () => {

      it('should be the kernel specs', () => {
        expect(manager.specs.default).to.be(KERNELSPECS.default);
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', (done) => {
        manager.dispose();
        manager = new SessionManager();
        expect(manager.isReady).to.be(false);
        manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', (done) => {
        manager.ready.then(done, done);
      });

    });

    describe('#running()', () => {

      it('should get the running sessions', () => {
        let test = JSONExt.deepEqual(toArray(manager.running()), data);
        expect(test).to.be(true);
      });

    });

    describe('#specsChanged', () => {

      it('should be emitted when the specs change', (done) => {
        let specs = copy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        tester.specs = specs;
        manager.specsChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(args.default).to.be(specs.default);
          done();
        });
        manager.refreshSpecs();
      });

    });

    describe('#runningChanged', () => {

      it('should be emitted in refreshRunning when the running sessions changed', (done) => {
        let sessionModels = [createSessionModel(), createSessionModel()];
        tester.runningSessions = sessionModels;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(JSONExt.deepEqual(toArray(args), sessionModels)).to.be(true);
          done();
        });
        manager.refreshRunning();
      });

      it('should be emitted when a session is shut down', (done) => {
        manager.startNew({ path: 'foo' }).then(s => {
          manager.runningChanged.connect(() => {
            manager.dispose();
            done();
          });
          return s.shutdown();
        }).catch(done);
      });

      it('should be emitted when a session is renamed', (done) => {
        manager.startNew({ path: 'foo' }).then(s => {
          let model = {
            id: s.id,
            kernel: s.kernel.model,
            notebook: { path: 'bar' }
          };
          tester.onRequest = () => {
            tester.respond(200, model);
          };
          manager.runningChanged.connect(() => {
            manager.dispose();
            done();
          });
          return s.rename(model.notebook.path);
        }).catch(done);
      });

      it('should be emitted when a session changes kernels', (done) => {
        manager.startNew({ path: 'foo' }).then(s => {
          let model = {
            id: s.id,
            kernel: {
              name: 'foo',
              id: uuid()
            },
            notebook: { path: 'bar' }
          };
          let name = model.kernel.name;
          tester.onRequest = request => {
            if (request.method === 'PATCH') {
              tester.respond(200, model);
            } else {
              tester.respond(200, { name, id: model.kernel.id });
            }
          };
          manager.runningChanged.connect(() => {
            manager.dispose();
            done();
          });
          return s.changeKernel({ name });
        }).catch(done);
      });

    });

    describe('#refreshRunning()', () => {

      it('should refresh the list of session ids', (done) => {
        let sessionModels = [createSessionModel(), createSessionModel()];
        tester.runningSessions = sessionModels;
        manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(running[0]).to.eql(sessionModels[0]);
          expect(running[1]).to.eql(sessionModels[1]);
          done();
        });

      });

    });

    describe('#refreshSpecs()', () => {

      it('should refresh the specs', (done) => {
        let specs = copy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        tester.specs = specs;
        manager.refreshSpecs().then(() => {
          expect(manager.specs.default).to.be(specs.default);
          done();
        }).catch(done);
      });

    });

    describe('#startNew()', () => {

      it('should start a session', (done) => {
        manager.startNew({ path: 'test.ipynb'}).then(s => {
          session = s;
          expect(session.id).to.be.ok();
          done();
        }).catch(done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        manager.startNew({ path: 'foo.ipynb' });
      });

    });

    describe('#findByPath()', () => {

      it('should find an existing session by path', (done) => {
        manager.startNew({ path: 'test.ipynb' }).then(s => {
          session = s;
          tester.runningSessions = [s.model];
          return manager.findByPath(session.path);
        }).then(newModel => {
          expect(newModel.id).to.be(session.id);
          done();
        }).catch(done);
      });

    });


    describe('#findById()', () => {

      it('should find an existing session by id', (done) => {
        manager.startNew({ path: 'test.ipynb' }).then(s => {
          session = s;
          tester.runningSessions = [s.model];
          return manager.findById(session.id);
        }).then(newModel => {
          expect(newModel.id).to.be(session.id);
          done();
        }).catch(done);
      });

    });

    describe('#connectTo()', () => {

      it('should connect to a running session', (done) => {
        manager.startNew({ path: 'test.ipynb' }).then(s => {
          session = s;
          manager.connectTo(session.id).then(newSession => {
            expect(newSession.id).to.be(session.id);
            expect(newSession.kernel.id).to.be(session.kernel.id);
            expect(newSession).to.not.be(session);
            expect(newSession.kernel).to.not.be(session.kernel);
            newSession.dispose();
            done();
          });
        }).catch(done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        let model = createSessionModel();
        tester.runningSessions = [model];
        manager.connectTo(model.id);
      });

    });

    describe('shutdown()', () => {

      it('should shut down a session by id', (done) => {
        manager.shutdown('foo').then(done, done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect((sender, args) => {
          done();
        });
        manager.shutdown(data[0].id);
      });

    });

  });

});
