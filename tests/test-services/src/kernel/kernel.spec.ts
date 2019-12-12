// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { toArray } from '@phosphor/algorithm';

import { KernelAPI } from '@jupyterlab/services';

import { expectFailure, testEmission } from '@jupyterlab/testutils';

import {
  KernelTester,
  makeSettings,
  PYTHON_SPEC,
  getRequestHandler
} from '../utils';

const PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

describe('kernel', () => {
  let tester: KernelTester;

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  afterEach(async () => {
    let models = await KernelAPI.listRunning();
    await Promise.all(models.map(m => KernelAPI.shutdownKernel(m.id)));
  });

  describe('Kernel.listRunning()', () => {
    it('should yield a list of valid kernel ids', async () => {
      expect(toArray(await KernelAPI.listRunning()).length).to.equal(0);
      const kernel = await KernelAPI.startNew();
      expect(toArray(await KernelAPI.listRunning()).length).to.be.greaterThan(
        0
      );
      await KernelAPI.shutdownKernel(kernel.id);
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const k = await KernelAPI.startNew({}, serverSettings);
      const response = await KernelAPI.listRunning(serverSettings);
      expect(toArray(response).length).to.be.greaterThan(0);
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

    // TODO: fix this test. The idea here is that if a kernel immediately
    // replies that it is dead, we still construct the kernel object and give it
    // a chance to handle the dead status. When is this going to happen? A
    // kernel typically doesn't immediately send its status, does it? I suppose
    // it should - if we are connecting to an existing kernel, it would be nice
    // to know right off if it's busy/dead/etc.
    it('should still start if the kernel dies', async () => {
      tester = new KernelTester();
      tester.initialStatus = 'dead';
      const kernel = await tester.start();
      await testEmission(kernel.statusChanged, {
        test: (sender, state) => {
          return state === 'dead';
        }
      });
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
      expect(kernels.find(k => k.id === kernel.id)).to.be.undefined;
    });

    it('should handle a 404 error', () => {
      return KernelAPI.shutdownKernel(UUID.uuid4());
    });
  });
});
