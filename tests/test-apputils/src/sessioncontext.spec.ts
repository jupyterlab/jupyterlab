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

    let session: SessionContext;

    beforeAll(
      async () =>
        await Promise.all([
          sessionManager.ready,
          kernelManager.ready,
          specsManager.ready
        ])
    );

    beforeEach(() => {
      Dialog.flush();
      session = new SessionContext({
        sessionManager,
        specsManager,
        kernelPreference: { name: specsManager.specs.default }
      });
    });

    afterEach(async () => {
      Dialog.flush();
      try {
        await session.shutdown();
      } catch (error) {
        console.warn('Session shutdown failed.', error);
      }
      session.dispose();
    });

    describe('#constructor()', () => {
      it('should create a client session', () => {
        expect(session).to.be.an.instanceof(SessionContext);
      });
    });

    describe('#disposed', () => {
      it('should be emitted when the session is disposed', async () => {
        await session.initialize();
        session.disposed.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.be.undefined;
        });
        await session.shutdown();
      });
    });

    describe('#kernelChanged', () => {
      it('should be emitted when the kernel changes', async () => {
        session.kernelChanged.connect((sender, { oldValue, newValue }) => {
          expect(sender).to.equal(session);
          expect(oldValue).to.be.null;
          expect(newValue).to.equal(session.kernel);
        });
        await session.initialize();
      });
    });

    describe('#statusChanged', () => {
      it('should be emitted when the status changes', async () => {
        session.statusChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(typeof args).to.equal('string');
        });
        await session.initialize();
      });
    });

    describe('#iopubMessage', () => {
      it('should be emitted for iopub kernel messages', async () => {
        session.iopubMessage.connect((sender, args) => {
          expect(sender).to.equal(session);
        });
        await session.initialize();
      });
    });

    describe('#propertyChanged', () => {
      it('should be emitted when a session path changes', async () => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.equal('path');
        });
        await session.session.setPath('foo');
      });

      it('should be emitted when a session name changes', async () => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.equal('name');
        });
        await session.session.setName('foo');
      });

      it('should be emitted when a session type changes', async () => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.equal('type');
        });
        await session.session.setType('foo');
      });
    });

    describe('#kernel', () => {
      it('should be the current kernel of the the session', async () => {
        expect(session.kernel).to.be.null;
        await session.initialize();
        expect(session.kernel).to.be.ok;
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
        session.kernelPreference = preference;
        expect(session.kernelPreference).to.equal(preference);
      });
    });

    describe('#manager', () => {
      it('should be the session manager used by the session', () => {
        expect(session.manager).to.equal(sessionManager);
      });
    });

    describe('#initialize()', () => {
      it('should start the default kernel', async () => {
        await session.initialize();
        expect(session.kernel.name).to.equal(specsManager.specs.default);
      });

      it('should connect to an existing session on the path', async () => {
        const other = await sessionManager.startNew({
          name: '',
          path: session.session.path,
          type: 'test'
        });

        await session.initialize();
        expect(other.kernel.id).to.equal(session.kernel.id);
        await other.shutdown();
        other.dispose();
      });

      it('should connect to an existing kernel', async () => {
        // Shut down and dispose the session so it can be re-instantiated.
        await session.shutdown();
        session.dispose();

        const other = await sessionManager.startNew({
          name: '',
          path: UUID.uuid4(),
          type: 'test'
        });
        const kernelPreference = { id: other.kernel.id };

        session = new SessionContext({
          sessionManager,
          specsManager,
          kernelPreference
        });
        await session.initialize();
        expect(session.kernel.id).to.equal(other.kernel.id);
        // We don't call other.shutdown() here because that
        // is handled by the afterEach() handler above.
        other.dispose();
      });

      it('should present a dialog if there is no distinct kernel to start', async () => {
        // Remove the kernel preference before initializing.
        session.kernelPreference = {};

        const accept = acceptDialog();

        await session.initialize();
        await accept;
        expect(session.kernel.name).to.equal(specsManager.specs.default);
      });

      it('should be a no-op if the shouldStart kernelPreference is false', async () => {
        session.kernelPreference = { shouldStart: false };
        await session.initialize();
        expect(session.kernel).to.not.be.ok;
      });

      it('should be a no-op if the canStart kernelPreference is false', async () => {
        session.kernelPreference = { canStart: false };
        await session.initialize();
        expect(session.kernel).to.not.be.ok;
      });
    });

    describe('#kernelDisplayName', () => {
      it('should be the display name of the current kernel', async () => {
        expect(session.kernelDisplayName).to.equal('No Kernel!');
        await session.initialize();
        expect(session.kernelDisplayName).to.not.equal('No Kernel!');
      });
    });

    describe('#isDisposed', () => {
      it('should test whether a client session has been disposed', () => {
        expect(session.isDisposed).to.equal(false);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the client session', () => {
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });
    });

    describe('#changeKernel()', () => {
      it('should change the current kernel', async () => {
        await session.initialize();

        const name = session.kernel.name;
        const id = session.kernel.id;
        const kernel = await session.changeKernel({ name });

        expect(kernel.id).to.not.equal(id);
        expect(kernel.name).to.equal(name);
      });
    });

    describe('#selectKernel()', () => {
      it('should select a kernel for the session', async () => {
        await session.initialize();

        const { id, name } = session.kernel;
        const accept = acceptDialog();

        await session.selectKernel();
        await accept;

        expect(session.kernel.id).to.not.equal(id);
        expect(session.kernel.name).to.equal(name);
      });

      it('should keep the existing kernel if dismissed', async () => {
        await session.initialize();

        const { id, name } = session.kernel;
        const dismiss = dismissDialog();

        await session.selectKernel();
        await dismiss;

        expect(session.kernel.id).to.equal(id);
        expect(session.kernel.name).to.equal(name);
      });
    });

    describe('#shutdown', () => {
      it('should kill the kernel and shut down the session', async () => {
        await session.initialize();
        expect(session.kernel).to.not.equal(null);
        await session.shutdown();
        expect(session.kernel).to.be.null;
      });
    });

    describe('#restart()', () => {
      it('should restart if the user accepts the dialog', async () => {
        const emission = testEmission(session.statusChanged, {
          find: (_, args) => args === 'restarting'
        });
        await session.initialize();
        const restart = session.restart();

        await acceptDialog();
        expect(await restart).to.equal(true);
        await emission;
      });

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        await session.initialize();
        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = session.restart();

        await dismissDialog();
        expect(await restart).to.equal(false);
        expect(called).to.equal(false);
      });

      it('should start the same kernel as the previously started kernel', async () => {
        await session.initialize();
        await session.shutdown();
        await session.restart();
        expect(session.kernel).to.be.ok;
      });
    });

    describe('#restartKernel()', () => {
      it('should restart if the user accepts the dialog', async () => {
        let called = false;

        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });
        await session.initialize();

        const restart = SessionContext.restartKernel(session.kernel);

        await acceptDialog();
        expect(await restart).to.equal(true);
        expect(called).to.equal(true);
      }, 30000); // Allow for slower CI

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });
        await session.initialize();

        const restart = SessionContext.restartKernel(session.kernel);

        await dismissDialog();
        expect(await restart).to.equal(false);
        expect(called).to.equal(false);
      }, 30000); // Allow for slower CI
    });

    describe('.getDefaultKernel()', () => {
      beforeEach(() => {
        session.dispose();
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
        session.dispose();
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
