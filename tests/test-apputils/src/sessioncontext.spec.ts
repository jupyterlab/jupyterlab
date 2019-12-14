// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import {
  SessionManager,
  KernelManager,
  KernelSpecManager
} from '@jupyterlab/services';

import { SessionContext, Dialog, ISessionContext } from '@jupyterlab/apputils';

import { UUID } from '@phosphor/coreutils';

import {
  acceptDialog,
  dismissDialog,
  testEmission
} from '@jupyterlab/testutils';

describe('@jupyterlab/apputils', () => {
  describe('SessionContext', () => {
    const kernelManager = new KernelManager();
    const sessionManager = new SessionManager({ kernelManager });
    const specsManager = new KernelSpecManager();
    let path = '';
    let sessionContext: SessionContext;

    beforeAll(
      async () =>
        await Promise.all([
          sessionManager.ready,
          kernelManager.ready,
          specsManager.ready
        ])
    );

    beforeEach(async () => {
      Dialog.flush();
      path = UUID.uuid4();
      sessionContext = new SessionContext({
        path,
        sessionManager,
        specsManager,
        kernelPreference: { name: specsManager.specs.default }
      });
    });

    afterEach(async () => {
      Dialog.flush();
      try {
        await sessionContext.shutdown();
      } catch (error) {
        console.warn('Session shutdown failed.', error);
      }
      sessionContext.dispose();
    });

    describe('#constructor()', () => {
      it('should create a session context', () => {
        expect(sessionContext).to.be.an.instanceof(SessionContext);
      });
    });

    describe('#disposed', () => {
      it('should be emitted when the session context is disposed', async () => {
        await sessionContext.initialize();
        let called = false;
        sessionContext.disposed.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          expect(args).to.be.undefined;
          called = true;
        });
        sessionContext.dispose();
        expect(called).to.be.true;
      });
    });

    describe('#kernelChanged', () => {
      it('should be emitted when the kernel changes', async () => {
        let called = false;
        sessionContext.kernelChanged.connect(
          (sender, { oldValue, newValue }) => {
            expect(sender).to.equal(sessionContext);
            expect(oldValue).to.be.null;
            expect(newValue).to.equal(sessionContext.kernel);
            called = true;
          }
        );
        await sessionContext.initialize();
        expect(called).to.be.true;
      });
    });

    describe('#statusChanged', () => {
      it('should be emitted when the status changes', async () => {
        let called = false;
        sessionContext.statusChanged.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          expect(typeof args).to.equal('string');
          called = true;
        });
        await sessionContext.initialize();
        await sessionContext.session.kernel.info;
        expect(called).to.be.true;
      });
    });

    describe('#iopubMessage', () => {
      it('should be emitted for iopub kernel messages', async () => {
        let called = false;
        sessionContext.iopubMessage.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          called = true;
        });
        await sessionContext.initialize();
        await sessionContext.session.kernel.info;
        expect(called).to.be.true;
      });
    });

    describe('#propertyChanged', () => {
      it('should be emitted when a session path changes', async () => {
        let called = false;
        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          expect(args).to.equal('path');
          called = true;
        });
        await sessionContext.session.setPath('foo');
        expect(called).to.be.true;
      });

      it('should be emitted when a session name changes', async () => {
        let called = false;
        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          expect(args).to.equal('name');
          called = true;
        });
        await sessionContext.session.setName('foo');
        expect(called).to.be.true;
      });

      it('should be emitted when a session type changes', async () => {
        let called = false;

        await sessionContext.initialize();
        sessionContext.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(sessionContext);
          expect(args).to.equal('type');
          called = true;
        });
        await sessionContext.session.setType('foo');
        expect(called).to.be.true;
      });
    });

    describe('#kernel', () => {
      it('should be the current kernel of the the session', async () => {
        expect(sessionContext.kernel).to.be.null;
        await sessionContext.initialize();
        expect(sessionContext.kernel).to.be.ok;
      });
    });

    describe('#kernelPreference', () => {
      it('should be the kernel preference of the session', () => {
        const preference: ISessionContext.IKernelPreference = {
          name: 'foo',
          language: 'bar',
          id: '1234',
          shouldStart: true,
          canStart: true
        };
        sessionContext.kernelPreference = preference;
        expect(sessionContext.kernelPreference).to.equal(preference);
      });
    });

    describe('#manager', () => {
      it('should be the session manager used by the session', () => {
        expect(sessionContext.manager).to.equal(sessionManager);
      });
    });

    describe('#initialize()', () => {
      it('should start the default kernel', async () => {
        await sessionContext.initialize();
        expect(sessionContext.kernel.name).to.equal(specsManager.specs.default);
      });

      it('should connect to an existing session on the path', async () => {
        const other = await sessionManager.startNew({
          name: '',
          path,
          type: 'test'
        });

        await sessionContext.initialize();
        expect(other.kernel.id).to.equal(sessionContext.kernel.id);
        await other.shutdown();
        other.dispose();
      });

      it('should connect to an existing kernel', async () => {
        // Shut down and dispose the session so it can be re-instantiated.
        await sessionContext.shutdown();
        sessionContext.dispose();

        const other = await sessionManager.startNew({
          name: '',
          path: UUID.uuid4(),
          type: 'test'
        });
        const kernelPreference = { id: other.kernel.id };

        sessionContext = new SessionContext({
          sessionManager,
          specsManager,
          kernelPreference
        });
        await sessionContext.initialize();
        expect(sessionContext.kernel.id).to.equal(other.kernel.id);
        // We don't call other.shutdown() here because that
        // is handled by the afterEach() handler above.
        other.dispose();
      });

      it('should present a dialog if there is no distinct kernel to start', async () => {
        // Remove the kernel preference before initializing.
        sessionContext.kernelPreference = {};

        const accept = acceptDialog();

        await sessionContext.initialize();
        await accept;
        expect(sessionContext.kernel.name).to.equal(specsManager.specs.default);
      });

      it('should be a no-op if the shouldStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { shouldStart: false };
        await sessionContext.initialize();
        expect(sessionContext.kernel).to.not.be.ok;
      });

      it('should be a no-op if the canStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { canStart: false };
        await sessionContext.initialize();
        expect(sessionContext.kernel).to.not.be.ok;
      });
    });

    describe('#kernelDisplayName', () => {
      it('should be the display name of the current kernel', async () => {
        expect(sessionContext.kernelDisplayName).to.equal('No Kernel!');
        await sessionContext.initialize();
        expect(sessionContext.kernelDisplayName).to.not.equal('No Kernel!');
      });
    });

    describe('#isDisposed', () => {
      it('should test whether a client session has been disposed', () => {
        expect(sessionContext.isDisposed).to.equal(false);
        sessionContext.dispose();
        expect(sessionContext.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the client session', () => {
        sessionContext.dispose();
        expect(sessionContext.isDisposed).to.equal(true);
        sessionContext.dispose();
        expect(sessionContext.isDisposed).to.equal(true);
      });
      it.todo('should shut down the session when shutdownOnDispose is true');
    });

    describe('#changeKernel()', () => {
      it('should change the current kernel', async () => {
        await sessionContext.initialize();

        const name = sessionContext.kernel.name;
        const id = sessionContext.kernel.id;
        const kernel = await sessionContext.changeKernel({ name });

        expect(kernel.id).to.not.equal(id);
        expect(kernel.name).to.equal(name);
      });
    });

    describe('#selectKernel()', () => {
      it('should select a kernel for the session', async () => {
        await sessionContext.initialize();

        const { id, name } = sessionContext.kernel;
        const accept = acceptDialog();

        await sessionContext.selectKernel();
        await accept;

        expect(sessionContext.kernel.id).to.not.equal(id);
        expect(sessionContext.kernel.name).to.equal(name);
      });

      it('should keep the existing kernel if dismissed', async () => {
        await sessionContext.initialize();

        const { id, name } = sessionContext.kernel;
        const dismiss = dismissDialog();

        await sessionContext.selectKernel();
        await dismiss;

        expect(sessionContext.kernel.id).to.equal(id);
        expect(sessionContext.kernel.name).to.equal(name);
      });
    });

    describe('#shutdown', () => {
      it('should kill the kernel and shut down the session', async () => {
        await sessionContext.initialize();
        expect(sessionContext.kernel).to.not.equal(null);
        await sessionContext.shutdown();
        expect(sessionContext.kernel).to.be.null;
      });
    });

    describe('#restart()', () => {
      it('should restart if the user accepts the dialog', async () => {
        const emission = testEmission(sessionContext.statusChanged, {
          find: (_, args) => args === 'restarting'
        });
        await sessionContext.initialize();
        await sessionContext.session?.kernel?.info;
        const restart = sessionContext.restart();

        await acceptDialog();
        expect(await restart).to.equal(true);
        await emission;
      });

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        await sessionContext.initialize();
        sessionContext.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = sessionContext.restart();

        await dismissDialog();
        expect(await restart).to.equal(false);
        expect(called).to.equal(false);
      });

      it('should start the same kernel as the previously started kernel', async () => {
        await sessionContext.initialize();
        await sessionContext.shutdown();
        await sessionContext.restart();
        expect(sessionContext.kernel).to.be.ok;
      });
    });

    describe('#restartKernel()', () => {
      it('should restart if the user accepts the dialog', async () => {
        let called = false;

        sessionContext.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });
        await sessionContext.initialize();
        await sessionContext.session.kernel.info;

        const restart = SessionContext.restartKernel(sessionContext.kernel);

        await acceptDialog();
        expect(await restart).to.equal(true);
        expect(called).to.equal(true);
      }, 30000); // Allow for slower CI

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        sessionContext.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });
        await sessionContext.initialize();
        await sessionContext.session.kernel.info;

        const restart = SessionContext.restartKernel(sessionContext.kernel);

        await dismissDialog();
        expect(await restart).to.equal(false);
        expect(called).to.equal(false);
      }, 30000); // Allow for slower CI
    });

    describe('.getDefaultKernel()', () => {
      beforeEach(() => {
        sessionContext.dispose();
      });

      it('should return null if no options are given', () => {
        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: {}
          })
        ).to.be.null;
      });

      it('should return a matching name', () => {
        const spec = specsManager.specs.kernelspecs[specsManager.specs.default];

        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: { name: spec.name }
          })
        ).to.equal(spec.name);
      });

      it('should return null if no match is found', () => {
        expect(
          SessionContext.getDefaultKernel({
            specs: specsManager.specs,
            preference: { name: 'foo' }
          })
        ).to.be.null;
      });

      it('should return a matching language', () => {
        const spec = specsManager.specs.kernelspecs[specsManager.specs.default];
        const kernelspecs: any = {};

        kernelspecs[spec.name] = spec;
        expect(
          SessionContext.getDefaultKernel({
            specs: {
              default: spec.name,
              kernelspecs
            },
            preference: { language: spec.language }
          })
        ).to.equal(spec.name);
      });

      it('should return null if a language matches twice', () => {
        const spec = specsManager.specs.kernelspecs[specsManager.specs.default];
        const kernelspecs: any = {};

        kernelspecs['foo'] = spec;
        kernelspecs['bar'] = spec;
        expect(
          SessionContext.getDefaultKernel({
            specs: {
              default: spec.name,
              kernelspecs
            },
            preference: { language: spec.language }
          })
        ).to.be.null;
      });
    });

    describe('.populateKernelSelect()', () => {
      beforeEach(() => {
        sessionContext.dispose();
      });

      it('should populate the select div', () => {
        const div = document.createElement('select');

        SessionContext.populateKernelSelect(div, {
          specs: specsManager.specs,
          preference: {}
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.not.equal('null');
      });

      it('should select the null option', () => {
        const div = document.createElement('select');

        SessionContext.populateKernelSelect(div, {
          specs: specsManager.specs,
          preference: { shouldStart: false }
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.equal('null');
      });

      it('should disable the node', () => {
        const div = document.createElement('select');

        SessionContext.populateKernelSelect(div, {
          specs: specsManager.specs,
          preference: { canStart: false }
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.equal('null');
        expect(div.disabled).to.equal(true);
      });
    });
  });
});
