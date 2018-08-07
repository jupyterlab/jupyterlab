// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { SessionManager } from '@jupyterlab/services';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { UUID } from '@phosphor/coreutils';

import { acceptDialog, dismissDialog } from '@jupyterlab/testutils';

describe('@jupyterlab/apputils', () => {
  describe('ClientSession', () => {
    const manager = new SessionManager();
    let session: ClientSession;

    before(() => manager.ready);

    beforeEach(() => {
      session = new ClientSession({
        manager,
        kernelPreference: { name: manager.specs.default }
      });
    });

    afterEach(async () => {
      await session.shutdown();
      session.dispose();
    });

    describe('#constructor()', () => {
      it('should create a client session', () => {
        expect(session).to.be.an.instanceof(ClientSession);
      });
    });

    describe('#terminated', () => {
      it('should be emitted when the session is terminated', async () => {
        await session.initialize();
        session.terminated.connect((sender, args) => {
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
        await session.setPath('foo');
      });

      it('should be emitted when a session name changes', async () => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.equal('name');
        });
        await session.setName('foo');
      });

      it('should be emitted when a session type changes', async () => {
        session.kernelPreference = { canStart: false };
        session.propertyChanged.connect((sender, args) => {
          expect(sender).to.equal(session);
          expect(args).to.equal('type');
        });
        await session.setType('foo');
      });
    });

    describe('#kernel', () => {
      it('should be the current kernel of the the session', async () => {
        expect(session.kernel).to.be.null;
        await session.initialize();
        expect(session.kernel).to.be.ok;
      });
    });

    describe('#path', () => {
      it('should current path of the the session', async () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.path).to.equal('string');
        await session.setPath('foo');
        expect(session.path).to.equal('foo');
      });
    });

    describe('#name', () => {
      it('should the current name of the the session', async () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.name).to.equal('string');
        await session.setName('foo');
        expect(session.name).to.equal('foo');
      });
    });

    describe('#type', () => {
      it('should the current type of the the session', async () => {
        session.kernelPreference = { canStart: false };
        expect(typeof session.type).to.equal('string');
        await session.setType('foo');
        expect(session.type).to.equal('foo');
      });
    });

    describe('#kernelPreference', () => {
      it('should be the kernel preference of the session', () => {
        const preference: IClientSession.IKernelPreference = {
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
        expect(session.manager).to.equal(manager);
      });
    });

    describe('#status', () => {
      it('should be the current status of the session', () => {
        expect(typeof session.status).to.equal('string');
      });
    });

    describe('#isReady', () => {
      it('should be false until ready', async () => {
        expect(session.isReady).to.equal(false);
        await session.initialize();
        expect(session.isReady).to.equal(true);
      });
    });

    describe('#initialize()', () => {
      it('should start the default kernel', async () => {
        await session.initialize();
        expect(session.kernel.name).to.equal(manager.specs.default);
      });

      it('should connect to an existing session on the path', async () => {
        const other = await manager.startNew({ path: session.path });

        await session.initialize();
        expect(other.kernel.id).to.equal(session.kernel.id);
        other.dispose();
      });

      it('should connect to an existing kernel', async () => {
        // Dispose the session so it can be re-instantiated.
        session.dispose();

        const other = await manager.startNew({ path: UUID.uuid4() });
        const kernelPreference = { id: other.kernel.id };

        session = new ClientSession({ manager, kernelPreference });
        await session.initialize();
        expect(session.kernel.id).to.equal(other.kernel.id);
        other.dispose();
      });

      it('should present a dialog if there is no distinct kernel to start', async () => {
        // Remove the kernel preference before initializing.
        session.kernelPreference = {};

        const accept = acceptDialog();

        await session.initialize();
        await accept;
        expect(session.kernel.name).to.equal(manager.specs.default);
      });

      it('should be a no-op if if the shouldStart kernelPreference is false', async () => {
        session.kernelPreference = { shouldStart: false };
        await session.initialize();
        expect(session.kernel).to.not.be.ok;
      });

      it('should be a no-op if if the canStart kernelPreference is false', async () => {
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
        let called = false;

        await session.initialize();
        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = session.restart();

        await acceptDialog();
        expect(await restart).to.equal(true);
        expect(called).to.equal(true);
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

    describe('#setPath()', () => {
      it('should change the session path', async () => {
        session.kernelPreference = { canStart: false };
        await session.setPath('foo');
        expect(session.path).to.equal('foo');
      });
    });

    describe('#setName', () => {
      it('should change the session name', async () => {
        session.kernelPreference = { canStart: false };
        await session.setName('foo');
        expect(session.name).to.equal('foo');
      });
    });

    describe('#setType()', () => {
      it('should set the session type', async () => {
        session.kernelPreference = { canStart: false };
        await session.setType('foo');
        expect(session.type).to.equal('foo');
      });
    });

    describe('.restartKernel()', () => {
      it('should restart if the user accepts the dialog', async () => {
        let called = false;

        await session.initialize();
        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = ClientSession.restartKernel(session.kernel);

        await acceptDialog();
        await restart;
        expect(called).to.equal(true);
      });

      it('should not restart if the user rejects the dialog', async () => {
        let called = false;

        await session.initialize();
        session.statusChanged.connect((sender, args) => {
          if (args === 'restarting') {
            called = true;
          }
        });

        const restart = ClientSession.restartKernel(session.kernel);

        await dismissDialog();
        await restart;
        expect(called).to.equal(false);
      });
    });

    describe('.getDefaultKernel()', () => {
      beforeEach(() => {
        session.dispose();
      });

      it('should return null if no options are given', () => {
        expect(
          ClientSession.getDefaultKernel({
            specs: manager.specs,
            preference: {}
          })
        ).to.be.null;
      });

      it('should return a matching name', () => {
        const spec = manager.specs.kernelspecs[manager.specs.default];

        expect(
          ClientSession.getDefaultKernel({
            specs: manager.specs,
            preference: { name: spec.name }
          })
        ).to.equal(spec.name);
      });

      it('should return null if no match is found', () => {
        expect(
          ClientSession.getDefaultKernel({
            specs: manager.specs,
            preference: { name: 'foo' }
          })
        ).to.be.null;
      });

      it('should return a matching language', () => {
        const spec = manager.specs.kernelspecs[manager.specs.default];
        const kernelspecs: any = {};

        kernelspecs[spec.name] = spec;
        expect(
          ClientSession.getDefaultKernel({
            specs: {
              default: spec.name,
              kernelspecs
            },
            preference: { language: spec.language }
          })
        ).to.equal(spec.name);
      });

      it('should return null if a language matches twice', () => {
        const spec = manager.specs.kernelspecs[manager.specs.default];
        const kernelspecs: any = {};

        kernelspecs['foo'] = spec;
        kernelspecs['bar'] = spec;
        expect(
          ClientSession.getDefaultKernel({
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

        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: {}
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.not.equal('null');
      });

      it('should select the null option', () => {
        const div = document.createElement('select');

        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: { shouldStart: false }
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.equal('null');
      });

      it('should disable the node', () => {
        const div = document.createElement('select');

        ClientSession.populateKernelSelect(div, {
          specs: manager.specs,
          preference: { canStart: false }
        });
        expect(div.firstChild).to.be.ok;
        expect(div.value).to.equal('null');
        expect(div.disabled).to.equal(true);
      });
    });
  });
});
