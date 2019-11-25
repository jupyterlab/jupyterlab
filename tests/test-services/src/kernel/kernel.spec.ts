// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { toArray } from '@phosphor/algorithm';

import { Kernel } from '@jupyterlab/services';

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
    let models = await Kernel.listRunning();
    await Promise.all(models.map(m => Kernel.shutdown(m.id)));
  });

  describe('Kernel.listRunning()', () => {
    it('should yield a list of valid kernel ids', async () => {
      const response = await Kernel.listRunning();
      expect(toArray(response).length).to.be.greaterThan(0);
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const kernel = await Kernel.startNew({ serverSettings });
      const response = await Kernel.listRunning(serverSettings);
      expect(toArray(response).length).to.be.greaterThan(0);
      await kernel.shutdown();
    });

    it('should throw an error for an invalid model', async () => {
      const data = { id: UUID.uuid4(), name: 'test' };
      const settings = getRequestHandler(200, data);
      const promise = Kernel.listRunning(settings);
      await expectFailure(promise, 'Invalid kernel list');
    });

    it('should throw an error for an invalid response', async () => {
      const settings = getRequestHandler(201, {});
      const promise = Kernel.listRunning(settings);
      await expectFailure(promise, 'Invalid response: 201 Created');
    });

    it('should throw an error for an error response', async () => {
      const settings = getRequestHandler(500, {});
      const promise = Kernel.listRunning(settings);
      await expectFailure(promise, '');
    });
  });

  describe('Kernel.startNew()', () => {
    it('should create an Kernel.IKernel object', async () => {
      const kernel = await Kernel.startNew({});
      expect(kernel.status).to.equal('unknown');
      await kernel.shutdown();
    });

    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      const kernel = await Kernel.startNew({ serverSettings });
      expect(kernel.status).to.equal('unknown');
      await kernel.shutdown();
    });

    // TODO: fix this test. The idea here is that if a kernel immediately
    // replies that it is dead, we still construct the kernel object and give it
    // a chance to handle the dead status. When is this going to happen? A
    // kernel typically doesn't immediately send its status, does it? I suppose
    // it should - if we are connecting to an existing kernel, it would be nice
    // to know right off if it's busy/dead/etc.
    it.skip('should still start if the kernel dies', async () => {
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
      const kernelPromise = Kernel.startNew({ serverSettings });
      await expectFailure(kernelPromise);
    });

    it('should throw an error for another invalid kernel id', async () => {
      const serverSettings = getRequestHandler(201, {
        id: UUID.uuid4(),
        name: 1
      });
      const kernelPromise = Kernel.startNew({ serverSettings });
      await expectFailure(kernelPromise);
    });

    it('should throw an error for an invalid response', async () => {
      const data = { id: UUID.uuid4(), name: 'foo' };
      const serverSettings = getRequestHandler(200, data);
      const kernelPromise = Kernel.startNew({ serverSettings });
      await expectFailure(kernelPromise, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', async () => {
      const serverSettings = getRequestHandler(500, {});
      const kernelPromise = Kernel.startNew({ serverSettings });
      await expectFailure(kernelPromise, '');
    });

    it('should auto-reconnect on websocket error', async () => {
      tester = new KernelTester();
      const kernel = await tester.start();

      const emission = testEmission(kernel.connectionStatusChanged, {
        find: (k, status) => status === 'connecting'
      });
      await tester.close();
      await emission;
    });
  });

  describe('Kernel.shutdown()', () => {
    it('should shut down a kernel by id', async () => {
      const k = await Kernel.startNew();
      await Kernel.shutdown(k.id);
    });

    it('should handle a 404 error', () => {
      return Kernel.shutdown(UUID.uuid4());
    });
  });
});
