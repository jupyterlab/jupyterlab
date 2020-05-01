// Copyright (c) Jupyter Development Team.

import 'jest';

import { toArray } from '@lumino/algorithm';

import { KernelManager, Kernel, KernelAPI } from '../../src';

import {
  testEmission,
  sleep,
  JupyterServer,
  flakyIt as it
} from '@jupyterlab/testutils';

import { makeSettings } from '../utils';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('kernel/manager', () => {
  let manager: KernelManager;
  let kernel: Kernel.IModel;

  beforeAll(async () => {
    jest.setTimeout(20000);
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
    const models = await KernelAPI.listRunning();
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
        expect(manager instanceof KernelManager).toBe(true);
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
        expect(manager.serverSettings.token).toBe(token);
      });
    });

    describe('#running()', () => {
      it('should get the running sessions', async () => {
        await manager.refreshRunning();
        expect(toArray(manager.running()).length).toBeGreaterThan(0);
      });
    });
    describe('#runningChanged', () => {
      it('should be emitted in refreshRunning when the running kernels changed', async () => {
        let called = false;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).toBe(manager);
          expect(toArray(args).length).toBeGreaterThan(0);
          called = true;
        });
        await KernelAPI.startNew();
        await manager.refreshRunning();
        expect(called).toBe(true);
      });

      it('should be emitted when a kernel is shut down', async () => {
        const kernel = await manager.startNew();
        await kernel.info;
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.shutdown(kernel.id);
        await manager.refreshRunning();
        expect(called).toBe(true);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new KernelManager({ standby: 'never' });
        expect(manager.isReady).toBe(false);
        await manager.ready;
        expect(manager.isReady).toBe(true);
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
        expect(toArray(manager.running()).length).toBeGreaterThan(0);
      });

      it('should update the running kernels when one is shut down', async () => {
        const old = toArray(manager.running()).length;
        await KernelAPI.startNew();
        await manager.refreshRunning();
        expect(toArray(manager.running()).length).toBeGreaterThan(old);
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
        const kernel = await manager.startNew();
        await kernel.info;
        expect(called).toBe(true);
      });
    });

    describe('#findById()', () => {
      it('should find an existing kernel by id', async () => {
        const id = kernel.id;
        const model = await manager.findById(id);
        expect(model!.id).toBe(id);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to an existing kernel', () => {
        const id = kernel.id;
        const newConnection = manager.connectTo({ model: kernel });
        expect(newConnection.model.id).toBe(id);
      });
    });

    describe('shutdown()', () => {
      it('should shut down a kernel by id', async () => {
        const kernel = await manager.startNew();
        await kernel.info;
        await manager.shutdown(kernel.id);
        expect(kernel.isDisposed).toBe(true);
      });

      it('should emit a runningChanged signal', async () => {
        const kernel = await manager.startNew();
        const emission = testEmission(manager.runningChanged, {
          test: () => {
            expect(kernel.isDisposed).toBe(false);
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
        await manager.refreshRunning();
        await kernel0.shutdown();
        expect(kernel0.status).toBe('dead');
        expect(kernel0.isDisposed).toBe(true);

        // Wait for the round trip to the server to update the connections.
        await sleep(100);
        expect(kernel1.status).toBe('dead');
        expect(kernel1.isDisposed).toBe(true);
      });
    });
  });
});
