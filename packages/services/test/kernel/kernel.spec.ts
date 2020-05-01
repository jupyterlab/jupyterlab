// Copyright (c) Jupyter Development Team.

import 'jest';

import { UUID } from '@lumino/coreutils';

import { toArray } from '@lumino/algorithm';

import { KernelAPI } from '../../src';

import {
  expectFailure,
  testEmission,
  JupyterServer,
  flakyIt as it
} from '@jupyterlab/testutils';

import {
  KernelTester,
  makeSettings,
  PYTHON_SPEC,
  getRequestHandler
} from '../utils';

const PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('kernel', () => {
  let tester: KernelTester;

  afterEach(async () => {
    if (tester) {
      tester.dispose();
    }
    const models = await KernelAPI.listRunning();
    await Promise.all(models.map(m => KernelAPI.shutdownKernel(m.id)));
  });

  describe('Kernel.listRunning()', () => {
    it('should yield a list of valid kernel ids', async () => {
      const kernel = await KernelAPI.startNew();
      expect(toArray(await KernelAPI.listRunning()).length).toBeGreaterThan(0);
      await KernelAPI.shutdownKernel(kernel.id);
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const k = await KernelAPI.startNew({}, serverSettings);
      const response = await KernelAPI.listRunning(serverSettings);
      expect(toArray(response).length).toBeGreaterThan(0);
      await KernelAPI.shutdownKernel(k.id);
    });

    it('should throw an error for an invalid model', async () => {
      const data = { id: UUID.uuid4(), name: 'test' };
      const settings = getRequestHandler(200, data);
      const promise = KernelAPI.listRunning(settings);
      await expectFailure(promise, 'Invalid kernel list');
    });

    it('should throw an error for an invalid response', async () => {
      const settings = getRequestHandler(201, {});
      const promise = KernelAPI.listRunning(settings);
      await expectFailure(promise, 'Invalid response: 201 Created');
    });

    it('should throw an error for an error response', async () => {
      const settings = getRequestHandler(500, {});
      const promise = KernelAPI.listRunning(settings);
      await expectFailure(promise, '');
    });
  });

  describe('KernelAPI.startNew()', () => {
    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      const k = await KernelAPI.startNew({}, serverSettings);
      await KernelAPI.shutdownKernel(k.id);
    });

    it('should still construct connection if the kernel dies', async () => {
      // If a kernel dies immediately, the kernel connection should still send
      // out the status signal, then dispose the connection.
      tester = new KernelTester();
      tester.initialStatus = 'dead';
      const kernel = await tester.start();
      const dead = testEmission(kernel.statusChanged, {
        test: (sender, state) => state === 'dead'
      });
      await dead;
      expect(kernel.isDisposed).toBe(true);
      expect(kernel.status).toBe('dead');
      tester.dispose();
    });

    it('should throw an error for an invalid kernel id', async () => {
      const serverSettings = getRequestHandler(201, { id: UUID.uuid4() });
      const kernelPromise = KernelAPI.startNew({}, serverSettings);
      await expectFailure(kernelPromise);
    });

    it('should throw an error for another invalid kernel id', async () => {
      const serverSettings = getRequestHandler(201, {
        id: UUID.uuid4(),
        name: 1
      });
      const kernelPromise = KernelAPI.startNew({}, serverSettings);
      await expectFailure(kernelPromise);
    });

    it('should throw an error for an invalid response', async () => {
      const data = { id: UUID.uuid4(), name: 'foo' };
      const serverSettings = getRequestHandler(200, data);
      const kernelPromise = KernelAPI.startNew({}, serverSettings);
      await expectFailure(kernelPromise, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', async () => {
      const serverSettings = getRequestHandler(500, {});
      const kernelPromise = KernelAPI.startNew({}, serverSettings);
      await expectFailure(kernelPromise, '');
    });

    it('should auto-reconnect on websocket error', async () => {
      tester = new KernelTester();
      const kernel = await tester.start();
      await kernel.info;

      const emission = testEmission(kernel.connectionStatusChanged, {
        find: (k, status) => status === 'connecting'
      });
      await tester.close();
      await emission;
    });
  });

  describe('Kernel.shutdown()', () => {
    it('should shut down a kernel by id', async () => {
      const kernel = await KernelAPI.startNew();
      await KernelAPI.shutdownKernel(kernel.id);
      const kernels = await KernelAPI.listRunning();
      expect(kernels.find(k => k.id === kernel.id)).toBeUndefined();
    });

    it('should handle a 404 error', () => {
      return KernelAPI.shutdownKernel(UUID.uuid4());
    });
  });
});
