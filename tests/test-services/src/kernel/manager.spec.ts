// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@lumino/algorithm';

import { KernelManager, Kernel, KernelAPI } from '@jupyterlab/services';

import { testEmission, sleep } from '@jupyterlab/testutils';

import { makeSettings } from '../utils';

describe('kernel/manager', () => {
  let manager: KernelManager;
  let kernel: Kernel.IModel;

  beforeAll(async () => {
    jest.setTimeout(120000);
    kernel = await KernelAPI.startNew();
  });

  beforeEach(() => {
    manager = new KernelManager({ standby: 'never' });
    return manager.ready;
  });

  afterEach(() => {
    manager.dispose();
  });

  afterAll(async () => {
    let models = await KernelAPI.listRunning();
    await Promise.all(models.map(m => KernelAPI.shutdownKernel(m.id)));
  });

  describe('KernelManager', () => {
    describe('#constructor()', () => {
      it('should take the options as an argument', async () => {
        manager.dispose();
        manager = new KernelManager({
          serverSettings: makeSettings(),
          standby: 'never'
        });
        expect(manager instanceof KernelManager).to.equal(true);
        await manager.ready;
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', async () => {
        manager.dispose();
        const serverSettings = makeSettings();
        const standby = 'never';
        const token = serverSettings.token;
        manager = new KernelManager({ serverSettings, standby });
        await manager.ready;
        expect(manager.serverSettings.token).to.equal(token);
      });
    });

    describe('#running()', () => {
      it('should get the running sessions', async () => {
        await manager.refreshRunning();
        expect(toArray(manager.running()).length).to.be.greaterThan(0);
      });
    });
    describe('#runningChanged', () => {
      it('should be emitted in refreshRunning when the running kernels changed', async () => {
        let called = false;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.equal(manager);
          expect(toArray(args).length).to.be.greaterThan(0);
          called = true;
        });
        await KernelAPI.startNew();
        await manager.refreshRunning();
        expect(called).to.equal(true);
      });

      it('should be emitted when a kernel is shut down', async () => {
        const kernel = await manager.startNew();
        await kernel.info;
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.shutdown(kernel.id);
        expect(called).to.equal(true);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new KernelManager({ standby: 'never' });
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

    describe('#refreshRunning()', () => {
      it('should update the running kernels', async () => {
        await manager.refreshRunning();
        expect(toArray(manager.running()).length).to.be.greaterThan(0);
      });

      it('should update the running kernels when one is shut down', async () => {
        const old = toArray(manager.running()).length;
        await KernelAPI.startNew();
        await manager.refreshRunning();
        expect(toArray(manager.running()).length).to.be.greaterThan(old);
      });
    });

    describe('#startNew()', () => {
      it('should start a new kernel', () => {
        return manager.startNew();
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        let kernel = await manager.startNew();
        await kernel.info;
        expect(called).to.equal(true);
      });
    });

    describe('#findById()', () => {
      it('should find an existing kernel by id', async () => {
        const id = kernel.id;
        const model = await manager.findById(id);
        expect(model!.id).to.equal(id);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to an existing kernel', () => {
        const id = kernel.id;
        const newConnection = manager.connectTo({ model: kernel });
        expect(newConnection.model.id).to.equal(id);
      });
    });

    describe('shutdown()', () => {
      it('should shut down a kernel by id', async () => {
        const kernel = await manager.startNew();
        await kernel.info;
        await manager.shutdown(kernel.id);
        expect(kernel.isDisposed).to.equal(true);
      });

      it('should emit a runningChanged signal', async () => {
        const kernel = await manager.startNew();
        const emission = testEmission(manager.runningChanged, {
          test: () => {
            expect(kernel.isDisposed).to.equal(false);
          }
        });
        await kernel.info;
        await manager.shutdown(kernel.id);
        await emission;
      });

      it('should dispose of all relevant kernel connections', async () => {
        const kernel0 = await manager.startNew();
        const kernel1 = manager.connectTo({ model: kernel0.model });
        await kernel0.info;
        await kernel1.info;
        await kernel0.shutdown();
        expect(kernel0.status).to.equal('dead');
        expect(kernel0.isDisposed).to.equal(true);

        // Wait for the round trip to the server to update the connections.
        await sleep(100);
        expect(kernel1.status).to.equal('dead');
        expect(kernel1.isDisposed).to.equal(true);
      });
    });
  });
});
