// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session, SessionManager
} from '@jupyterlab/services';

import {
  ClientSession, IClientSession
} from '@jupyterlab/apputils';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  acceptDialog, dismissDialog
} from '../utils';


describe('@jupyterlab/apputils', () => {

  describe('ClientSession', () => {

    const manager = new SessionManager();
    let session: ClientSession;

    before(() => {
      return manager.ready;
    });

    beforeEach(() => {
      session = new ClientSession({
        manager, kernelPreference: { name: manager.specs.default }
      });
    });

    afterEach(() => {
      return session.shutdown().then(() => {
        session.dispose();
      });
    });

    describe('#constructor()', () => {

      it('should create a client session', () => {
        expect(session).to.be.a(ClientSession);
      });

    });

    describe('#terminated', () => {

      it('should be emitted when the session is terminated', (done) => {
        session.initialize().then(() => {
          session.terminated.connect((sender, args) => {
            expect(sender).to.be(session);
            expect(args).to.be(undefined);
            done();
          });
          return session.shutdown();
        }).catch(done);
      });

    });

    describe('#kernelChanged', () => {

      it('should be emitted when the kernel changes', (done) => {
        session.kernelChanged.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(args).to.be.ok();
          done();
        });
        session.initialize().catch(done);
      });

    });

    describe('#statusChanged', () => {

      it('should be emitted when the status changes', (done) => {
        session.statusChanged.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(typeof args).to.be('string');
          done();
        });
        session.initialize().catch(done);
      });

    });

    describe('#iopubMessage', () => {

      it('should be emitted for iopub kernel messages', (done) => {
        session.iopubMessage.connect((sender, args) => {
          expect(sender).to.be(session);
          done();
        });
        session.initialize().catch(done);
      });

    });

    describe('#propertyChanged', () => {

      it('should be emitted when a session path changes', (done) => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(args).to.be('path');
          done();
        });
        session.setPath('foo').catch(done);
      });

      it('should be emitted when a session name changes', (done) => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(args).to.be('name');
          done();
        });
        session.setName('foo').catch(done);
      });

      it('should be emitted when a session type changes', (done) => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(args).to.be('type');
          done();
        });
        session.setType('foo').catch(done);
      });

    });

    describe('#kernel', () => {

      it('should be the current kernel of the the session', () => {
        expect(session.kernel).to.be(null);
        return session.initialize().then(() => {
          expect(session.kernel).to.be.ok();
        });
      });

    });

    describe('#path', () => {

      it('should current path of the the session', () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.path).to.be('string');
        return session.setPath('foo').then(() => {
          expect(session.path).to.be('foo');
        });
      });

    });

    describe('#name', () => {

      it('should the current name of the the session', () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.name).to.be('string');
        return session.setName('foo').then(() => {
          expect(session.name).to.be('foo');
        });
      });

    });

    describe('#type', () => {

      it('should the current type of the the session', () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.type).to.be('string');
        return session.setType('foo').then(() => {
          expect(session.type).to.be('foo');
        });
      });

    });

    describe('#kernelPreference', () => {

      it('should be the kernel preference of the session', () => {
        let preference: IClientSession.IKernelPreference = {
          name: 'foo',
          language: 'bar',
          id: '1234',
          shouldStart: true,
          canStart: true
        };
        session.kernelPreference = preference;
        expect(session.kernelPreference).to.be(preference);
      });

    });

    describe('#manager', () => {

      it('should be the session manager used by the session', () => {
        expect(session.manager).to.be(manager);
      });

    });

    describe('#status', () => {

      it('should be the current status of the session', () => {
        expect(typeof session.status).to.be('string');
      });

    });

    describe('#isReady', () => {

      it('should be false until ready', () => {
        expect(session.isReady).to.be(false);
        return session.initialize().then(() => {
          expect(session.isReady).to.be(true);
        });
      });

    });

    describe('#initialize()', () => {

      it('should start the default kernel', () => {
        return session.initialize().then(() => {
          expect(session.kernel.name).to.be(manager.specs.default);
        });
      });

      it('should connect to an existing session on the path', () => {
        let other: Session.ISession;
        return manager.startNew({ path: session.path }).then(o => {
          other = o;
          return session.initialize();
        }).then(() => {
          expect(session.kernel.id).to.be(other.kernel.id);
          return other.dispose();
        });
      });

      it('should connect to an existing kernel', () => {
        let other: Session.ISession;
        session.dispose();
        return manager.startNew({ path: uuid() }).then(o => {
          other = o;
          session = new ClientSession({
            manager, kernelPreference: { id: other.kernel.id }
          });
          return session.initialize();
        }).then(() => {
          expect(session.kernel.id).to.be(other.kernel.id);
          return other.dispose();
        });
      });

      it('should present a dialog if there is no distinct kernel to start', () => {
        session.kernelPreference = {};
        acceptDialog();
        return session.initialize().then(() => {
          expect(session.kernel.name).to.be(manager.specs.default);
        });
      });

      it('should be a no-op if if the shouldStart kernelPreference is false', () => {
        session.kernelPreference = { shouldStart: false };
        return session.initialize().then(() => {
          expect(session.kernel).to.not.be.ok();
        });
      });


      it('should be a no-op if if the canStart kernelPreference is false', () => {
        session.kernelPreference = { canStart: false };
        return session.initialize().then(() => {
          expect(session.kernel).to.not.be.ok();
        });
      });

    });

    describe('#kernelDisplayName', () => {

      it('should be the display name of the current kernel', () => {
        expect(session.kernelDisplayName).to.be('No Kernel!');
        return session.initialize().then(() => {
          expect(session.kernelDisplayName).to.not.be('No Kernel!');
        });
      });

    });


    describe('#isDisposed', () => {

      it('should test whether a client session has been disposed', () => {
        expect(session.isDisposed).to.be(false);
        session.dispose();
        expect(session.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose the resources held by the client session', () => {
        session.dispose();
        expect(session.isDisposed).to.be(true);
        session.dispose();
        expect(session.isDisposed).to.be(true);
      });

    });

    describe('#changeKernel()', () => {

      it('should change the current kernel', () => {
        let id = '';
        let name = '';
        return session.initialize().then(() => {
          name = session.kernel.name;
          id = session.kernel.id;
          return session.changeKernel({ name });
        }).then(kernel => {
          expect(kernel.id).to.not.be(id);
          expect(kernel.name).to.be(name);
        });
      });

    });

    describe('#selectKernel()', () => {

      it('should select a kernel for the session', () => {
        return session.initialize().then(() => {
          let { id, name } = session.kernel;
          acceptDialog();
          return session.selectKernel().then(() => {
            expect(session.kernel.id).to.not.be(id);
            expect(session.kernel.name).to.be(name);
          });
        });
      });

      it('should keep the existing kernel', () => {
        return session.initialize().then(() => {
          let { id, name } = session.kernel;
          dismissDialog();
          return session.selectKernel().then(() => {
            expect(session.kernel.id).to.be(id);
            expect(session.kernel.name).to.be(name);
          });
        });
      });

    });

    describe('#shutdown', () => {

      it('should kill the kernel and shut down the session', () => {
        return session.initialize().then(() => {
          return session.shutdown();
        }).then(() => {
          expect(session.kernel).to.be(null);
        });
      });

    });

    describe('#restart()', () => {

      it('should restart if the user accepts the dialog', () => {
        let called = false;
        return session.initialize().then(() => {
          acceptDialog();
          session.statusChanged.connect((sender, args) => {
            if (args === 'restarting') {
              called = true;
            }
          });
          return session.restart();
        }).then(() => {
          expect(called).to.be(true);
        });
      });

      it('should not restart if the user rejects the dialog', () => {
        let called = false;
        return session.initialize().then(() => {
          dismissDialog();
          session.statusChanged.connect((sender, args) => {
            if (args === 'restarting') {
              called = true;
            }
          });
          return session.restart();
        }).then(() => {
          expect(called).to.be(false);
        });
      });

      it('should start the same kernel as the previously started kernel', () => {
        return session.initialize().then(() => {
          return session.shutdown();
        }).then(() => {
          return session.restart();
        }).then(() => {
          expect(session.kernel).to.be.ok();
        });
      });

    });

    describe('#setPath()', () => {

      it('should change the session path', () => {
        session.kernelPreference = { canStart: false };
        return session.setPath('foo').then(() => {
          expect(session.path).to.be('foo');
        });
      });

    });

    describe('#setName', () => {

      it('should change the session name', () => {
        session.kernelPreference = { canStart: false };
        return session.setName('foo').then(() => {
          expect(session.name).to.be('foo');
        });
      });

    });

    describe('#setType()', () => {

      it('should set the session type', () => {
        session.kernelPreference = { canStart: false };
        return session.setType('foo').then(() => {
          expect(session.type).to.be('foo');
        });
      });

    });

    describe('.restartKernel()', () => {

      it('should restart if the user accepts the dialog', () => {
        let called = false;

        return session.initialize().then(() => {
          session.statusChanged.connect((sender, args) => {
            if (args === 'restarting') {
              called = true;
            }
          });
          acceptDialog();
          return ClientSession.restartKernel(session.kernel);
        }).then(() => {
          expect(called).to.be(true);
        });
      });

      it('should not restart if the user rejects the dialog', () => {
        let called = false;
        return session.initialize().then(() => {
          session.statusChanged.connect((sender, args) => {
            if (args === 'restarting') {
              called = true;
            }
          });
          dismissDialog();
          return ClientSession.restartKernel(session.kernel);
        }).then(() => {
          expect(called).to.be(false);
        });
      });

    });

    describe('.getDefaultKernel()', () => {

      beforeEach(() => {
        session.dispose();
      });

      it('should return null if no options are given', () => {
        expect(ClientSession.getDefaultKernel({
          specs: manager.specs,
          preference: {}
        })).to.be(null);
      });

      it('should return a matching name', () => {
        let spec = manager.specs.kernelspecs[manager.specs.default];
        expect(ClientSession.getDefaultKernel({
          specs: manager.specs,
          preference: { name: spec.name }
        })).to.be(spec.name);
      });

      it('should return null if no match is found', () => {
        expect(ClientSession.getDefaultKernel({
          specs: manager.specs,
          preference: { name: 'foo' }
        })).to.be(null);
      });

      it('should return a matching language', () => {
        let spec = manager.specs.kernelspecs[manager.specs.default];
        let kernelspecs: any = {};
        kernelspecs[spec.name] = spec;
        expect(ClientSession.getDefaultKernel({
          specs: {
            default: spec.name,
            kernelspecs,
          },
          preference: { language: spec.language }
        })).to.be(spec.name);
      });

      it('should return null if a language matches twice', () => {
        let spec = manager.specs.kernelspecs[manager.specs.default];
        let kernelspecs: any = {};
        kernelspecs['foo'] = spec;
        kernelspecs['bar'] = spec;
        expect(ClientSession.getDefaultKernel({
          specs: {
            default: spec.name,
            kernelspecs,
          },
          preference: { language: spec.language }
        })).to.be(null);
      });

    });

    describe('.populateKernelSelect()', () => {

      beforeEach(() => {
        session.dispose();
      });

      it('should populate the select div', () => {
        let div = document.createElement('select');
        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: {}
        });
        expect(div.firstChild).to.be.ok();
        expect(div.value).to.not.be('null');
      });

      it('should select the null option', () => {
        let div = document.createElement('select');
        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: { shouldStart: false }
        });
        expect(div.firstChild).to.be.ok();
        expect(div.value).to.be('null');
      });

      it('should disable the node', () => {
        let div = document.createElement('select');
        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: { canStart: false }
        });
        expect(div.firstChild).to.be.ok();
        expect(div.value).to.be('null');
        expect(div.disabled).to.be(true);
      });

    });

  });

});
