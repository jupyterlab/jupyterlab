// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { toArray } from '@phosphor/algorithm';

import { Kernel } from '../../../lib/kernel';

import {
  expectFailure,
  KernelTester,
  makeSettings,
  PYTHON_SPEC,
  getRequestHandler,
  testEmission
} from '../utils';

const PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

describe('kernel', () => {
  let defaultKernel: Kernel.IKernel;
  let specs: Kernel.ISpecModels;
  let tester: KernelTester;

  before(async () => {
    specs = await Kernel.getSpecs();
    defaultKernel = await Kernel.startNew();
    // Start another kernel.
    await Kernel.startNew();
  });

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  after(() => {
    return Kernel.shutdownAll();
  });

  describe('Kernel.listRunning()', () => {
    it('should yield a list of valid kernel ids', async () => {
      const response = await Kernel.listRunning();
      expect(toArray(response).length).to.be.greaterThan(0);
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const response = await Kernel.listRunning(serverSettings);
      expect(toArray(response).length).to.be.greaterThan(0);
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
      await kernel.ready;

      const emission = testEmission(kernel.statusChanged, {
        find: (k, status) => status === 'reconnecting'
      });
      tester.close();
      await emission;
    });
  });

  describe('Kernel.connectTo()', () => {
    it('should connect to an existing kernel', () => {
      const id = defaultKernel.id;
      const kernel = Kernel.connectTo(defaultKernel.model);
      expect(kernel.id).to.equal(id);
      kernel.dispose();
    });

    it('should accept server settings', () => {
      const id = defaultKernel.id;
      const serverSettings = makeSettings();
      const kernel = Kernel.connectTo(defaultKernel.model, serverSettings);
      expect(kernel.id).to.equal(id);
      kernel.dispose();
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

  describe('Kernel.getSpecs()', () => {
    it('should load the kernelspecs', async () => {
      const specs = await Kernel.getSpecs();
      expect(specs.default).to.be.ok;
    });

    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      const specs = await Kernel.getSpecs(serverSettings);
      expect(specs.default).to.be.ok;
    });

    it('should handle a missing default parameter', async () => {
      const serverSettings = getRequestHandler(200, {
        kernelspecs: { python: PYTHON_SPEC }
      });
      const specs = await Kernel.getSpecs(serverSettings);
      expect(specs.default).to.be.ok;
    });

    it('should throw for a missing kernelspecs parameter', async () => {
      const serverSettings = getRequestHandler(200, {
        default: PYTHON_SPEC.name
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No kernelspecs found');
    });

    it('should omit an invalid kernelspec', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'python',
        kernelspecs: {
          R: R_SPEC,
          python: PYTHON_SPEC
        }
      });
      const specs = await Kernel.getSpecs(serverSettings);
      expect(specs.default).to.equal('python');
      expect(specs.kernelspecs['R']).to.be.undefined;
    });

    it('should handle an improper name', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No valid kernelspecs found');
    });

    it('should handle an improper language', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.language = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No valid kernelspecs found');
    });

    it('should handle an improper argv', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.argv = 'hello';
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No valid kernelspecs found');
    });

    it('should handle an improper display_name', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.display_name = ['hello'];
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No valid kernelspecs found');
    });

    it('should handle missing resources', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete R_SPEC.resources;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'No valid kernelspecs found');
    });

    it('should throw an error for an invalid response', async () => {
      const serverSettings = getRequestHandler(201, {});
      const promise = Kernel.getSpecs(serverSettings);
      await expectFailure(promise, 'Invalid response: 201 Created');
    });
  });
});
