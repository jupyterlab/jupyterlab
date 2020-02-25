// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import {
  SessionManager,
  KernelManager,
  KernelSpecManager
} from '@jupyterlab/services';

import {
  SessionContext,
  Dialog,
  ISessionContext,
  sessionContextDialogs
} from '@jupyterlab/apputils';

import { UUID } from '@lumino/coreutils';

import {
  acceptDialog,
  dismissDialog,
  testEmission
} from '@jupyterlab/testutils';

import { SessionAPI } from '@jupyterlab/services';

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
        kernelPreference: { name: specsManager.specs?.default }
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
            expect(newValue).to.equal(sessionContext.session?.kernel);
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
        await sessionContext.session!.kernel!.info;
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
        await sessionContext.session!.kernel!.info;
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
        await sessionContext.session!.setPath('foo');
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
        await sessionContext.session!.setName('foo');
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
        await sessionContext.session!.setType('foo');
        expect(called).to.be.true;
      });
    });

    describe('#kernel', () => {
      it('should be the current kernel of the the session', async () => {
        expect(sessionContext.session?.kernel).to.not.be.ok;
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel).to.be.ok;
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
        expect(sessionContext.sessionManager).to.equal(sessionManager);
      });
    });

    describe('#initialize()', () => {
      it('should start the default kernel', async () => {
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel?.name).to.equal(
          specsManager.specs!.default
        );
      });

      it('should connect to an existing session on the path', async () => {
        const other = await sessionManager.startNew({
          name: '',
          path,
          type: 'test'
        });

        await sessionContext.initialize();
        expect(other.kernel?.id).to.not.be.undefined;
        expect(other.kernel?.id).to.equal(sessionContext.session?.kernel?.id);
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
        const kernelPreference = { id: other.kernel!.id };

        sessionContext = new SessionContext({
          sessionManager,
          specsManager,
          kernelPreference
        });
        await sessionContext.initialize();
        expect(other.kernel?.id).to.not.be.undefined;
        expect(other.kernel?.id).to.equal(sessionContext.session?.kernel?.id);
        // We don't call other.shutdown() here because that
        // is handled by the afterEach() handler above.
        other.dispose();
      });

      it('should yield true if there is no distinct kernel to start', async () => {
        // Remove the kernel preference before initializing.
        sessionContext.kernelPreference = {};
        const result = await sessionContext.initialize();
        expect(result).to.equal(true);
      });

      it('should be a no-op if the shouldStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { shouldStart: false };
        const result = await sessionContext.initialize();
        expect(result).to.equal(false);
        expect(sessionContext.session?.kernel).to.not.be.ok;
      });

      it('should be a no-op if the canStart kernelPreference is false', async () => {
        sessionContext.kernelPreference = { canStart: false };
        const result = await sessionContext.initialize();
        expect(result).to.equal(false);
        expect(sessionContext.session?.kernel).to.not.be.ok;
      });
    });

    describe('#kernelDisplayName', () => {
      it('should be the display name of the current kernel', async () => {
        await sessionContext.initialize();
        let spec = await sessionContext.session!.kernel!.spec;
        expect(sessionContext.kernelDisplayName).to.equal(spec!.display_name);
      });

      it('should display "No Kernel!" when there is no kernel', async () => {
        sessionContext.kernelPreference = {
          canStart: false,
          shouldStart: false
        };
        expect(sessionContext.kernelDisplayName).to.equal('No Kernel!');
      });

      it('should display "Kernel" when it looks like we are starting a kernel', async () => {
        sessionContext.kernelPreference = {};
        expect(sessionContext.kernelDisplayName).to.equal('Kernel');
      });
    });

    describe('#kernelDisplayStatus', () => {
      it('should be the status of the current kernel if connected', async () => {
        await sessionContext.initialize();
        await sessionContext.session!.kernel!.info;
        expect(sessionContext.kernelDisplayStatus).to.be.equal(
          sessionContext.session?.kernel?.status
        );
      });

      it('should be the connection status of the current kernel if not connected', async () => {
        await sessionContext.initialize();
        let reconnect = sessionContext.session!.kernel!.reconnect();
        expect(sessionContext.kernelDisplayStatus).to.be.equal(
          sessionContext.session?.kernel?.connectionStatus
        );
        await reconnect;
      });

      it('should be "initializing" if it looks like we are trying to start a kernel', async () => {
        sessionContext.kernelPreference = {};
        expect(sessionContext.kernelDisplayStatus).to.be.equal('initializing');
      });

      it('should be "" if there is no current kernel', async () => {
        await sessionContext.initialize();
        await sessionContext.shutdown();
        expect(sessionContext.kernelDisplayStatus).to.be.equal('');
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

      it('should not shut down the session by default', async () => {
        await sessionContext.initialize();
        const id = sessionContext.session!.id;
        sessionContext.dispose();
        const sessions = await SessionAPI.listRunning();
        expect(sessions.find(s => s.id === id)).to.be.ok;
      });

      it('should shut down the session when shutdownOnDispose is true', async () => {
        sessionContext.kernelPreference = {
          ...sessionContext.kernelPreference,
          shutdownOnDispose: true
        };
        await sessionContext.initialize();
        const id = sessionContext.session!.id;
        sessionContext.dispose();
        const sessions = await SessionAPI.listRunning();
        expect(sessions.find(s => s.id === id)).to.be.undefined;
      });
    });

    describe('#changeKernel()', () => {
      it('should change the current kernel', async () => {
        await sessionContext.initialize();

        const name = sessionContext.session?.kernel?.name;
        const id = sessionContext.session?.kernel?.id;
        const kernel = (await sessionContext.changeKernel({ name }))!;

        expect(kernel.id).to.not.equal(id);
        expect(kernel.name).to.equal(name);
      });
    });

    describe('#shutdown', () => {
      it('should kill the kernel and shut down the session', async () => {
        await sessionContext.initialize();
        expect(sessionContext.session?.kernel).to.be.ok;
        await sessionContext.shutdown();
        expect(sessionContext.session?.kernel).to.not.be.ok;
      });
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
        const spec = specsManager.specs!.kernelspecs[
          specsManager.specs!.default
        ]!;

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
        const spec = specsManager.specs!.kernelspecs[
          specsManager.specs!.default
        ]!;
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
        const spec = specsManager.specs!.kernelspecs[
          specsManager.specs!.default
        ]!;
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

    describe('.sessionContextDialogs', () => {
      describe('#selectKernel()', () => {
        it('should select a kernel for the session', async () => {
          await sessionContext.initialize();
          const session = sessionContext?.session;

          const { id, name } = session!.kernel!;
          const accept = acceptDialog();

          await sessionContextDialogs.selectKernel(sessionContext);
          await accept;

          expect(session!.kernel!.id).to.not.equal(id);
          expect(session!.kernel!.name).to.equal(name);
        });

        it('should keep the existing kernel if dismissed', async () => {
          await sessionContext.initialize();
          const session = sessionContext!.session;

          const { id, name } = session!.kernel!;
          const dismiss = dismissDialog();

          await sessionContextDialogs.selectKernel(sessionContext);
          await dismiss;

          expect(session!.kernel!.id).to.equal(id);
          expect(session!.kernel!.name).to.equal(name);
        });
      });

      describe('#restart()', () => {
        it('should restart if the user accepts the dialog', async () => {
          const emission = testEmission(sessionContext.statusChanged, {
            find: (_, args) => args === 'restarting'
          });
          await sessionContext.initialize();
          await sessionContext!.session?.kernel?.info;
          const restart = sessionContextDialogs.restart(sessionContext);

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

          const restart = sessionContextDialogs.restart(sessionContext);
          await dismissDialog();
          expect(await restart).to.equal(false);
          expect(called).to.equal(false);
        });

        it('should start the same kernel as the previously started kernel', async () => {
          await sessionContext.initialize();
          await sessionContext.shutdown();
          await sessionContextDialogs.restart(sessionContext);
          expect(sessionContext?.session?.kernel).to.be.ok;
        });
      });
    });
  });
});
