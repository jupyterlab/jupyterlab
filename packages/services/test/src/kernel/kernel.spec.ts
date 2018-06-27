// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  toArray
} from '@phosphor/algorithm';

import {
  Kernel
} from '../../../lib/kernel';

import {
  expectFailure, KernelTester, makeSettings,
  PYTHON_SPEC, getRequestHandler, testEmission
} from '../utils';



let PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';



describe('kernel', () => {

  let defaultKernel: Kernel.IKernel;
  let specs: Kernel.ISpecModels;
  let tester: KernelTester;

  before(() => {
    return Kernel.getSpecs().then(s => {
      specs = s;
      return Kernel.startNew();
    }).then(k => {
      defaultKernel = k;
      // Start another kernel.
      return Kernel.startNew();
    });
  });

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  after(() => {
    Kernel.shutdownAll();
  });

  describe('Kernel.listRunning()', () => {

    it('should yield a list of valid kernel ids', () => {
      return Kernel.listRunning().then(response => {
        expect(toArray(response).length).to.be.greaterThan(0);
      });
    });

    it('should accept server settings', () => {
      let serverSettings = makeSettings();
      return Kernel.listRunning(serverSettings).then(response => {
        expect(toArray(response).length).to.be.greaterThan(0);
      });
    });

    it('should throw an error for an invalid model', (done) => {
      let data = { id: uuid(), name: 'test' };
      let settings = getRequestHandler(200, data);
      let promise = Kernel.listRunning(settings);
      expectFailure(promise, done, 'Invalid kernel list');
    });

    it('should throw an error for an invalid response', (done) => {
      let settings = getRequestHandler(201, { });
      let promise = Kernel.listRunning(settings);
      expectFailure(promise, done, 'Invalid response: 201 Created');
    });

    it('should throw an error for an error response', (done) => {
      let settings = getRequestHandler(500, { });
      let promise = Kernel.listRunning(settings);
      expectFailure(promise, done, '');
    });

  });

  describe('Kernel.startNew()', () => {

    it('should create an Kernel.IKernel object', () => {
      return Kernel.startNew({}).then(kernel => {
        expect(kernel.status).to.be('unknown');
        return kernel.shutdown();
      });
    });

    it('should accept ajax options', () => {
      let serverSettings = makeSettings();
      return Kernel.startNew({ serverSettings }).then(kernel => {
        expect(kernel.status).to.be('unknown');
        return kernel.shutdown();
      });
    });

    // TODO: fix this test. The idea here is that if a kernel immediately
    // replies that it is dead, we still construct the kernel object and give it
    // a chance to handle the dead status. When is this going to happen? A
    // kernel typically doesn't immediately send its status, does it? I suppose
    // it should - if we are connecting to an existing kernel, it would be nice
    // to know right off if it's busy/dead/etc.
    it.skip('should still start if the kernel dies', (done) => {
      tester = new KernelTester();
      tester.initialStatus = 'dead';
      tester.start().then(kernel => {
        kernel.statusChanged.connect((sender, state) => {
          if (state === 'dead') {
            tester.dispose();
            done();
          }
        });
      }).catch(done);
    });

    it('should throw an error for an invalid kernel id', (done) => {
      let serverSettings = getRequestHandler(201, { id: uuid() });
      let kernelPromise = Kernel.startNew({ serverSettings });
      expectFailure(kernelPromise, done);
    });

    it('should throw an error for another invalid kernel id', (done) => {
      let serverSettings = getRequestHandler(201, { id: uuid(), name: 1 });
      let kernelPromise = Kernel.startNew({ serverSettings });
      expectFailure(kernelPromise, done);
    });

    it('should throw an error for an invalid response', (done) => {
      let data = { id: uuid(), name: 'foo' };
      let serverSettings = getRequestHandler(200, data);
      let kernelPromise = Kernel.startNew({ serverSettings });
      expectFailure(kernelPromise, done, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', (done) => {
      let serverSettings = getRequestHandler(500, { });
      let kernelPromise = Kernel.startNew({ serverSettings });
      expectFailure(kernelPromise, done, '');
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

    it('should connect to an exisiting kernel', () => {
      let id = defaultKernel.id;
      return Kernel.connectTo(defaultKernel.model).then(kernel => {
        expect(kernel.id).to.be(id);
        kernel.dispose();
      });
    });

    it('should accept server settings', () => {
      let id = defaultKernel.id;
      let serverSettings = makeSettings();
      return Kernel.connectTo(defaultKernel.model, serverSettings).then(kernel => {
        expect(kernel.id).to.be(id);
        kernel.dispose();
      });
    });

  });

  describe('Kernel.shutdown()', () => {

    it('should shut down a kernel by id', () => {
      return Kernel.startNew().then(k => {
        return Kernel.shutdown(k.id);
      });
    });

    it('should handle a 404 error', () => {
      return Kernel.shutdown(uuid());
    });

  });

  describe('Kernel.getSpecs()', () => {

    it('should load the kernelspecs', () => {
      return Kernel.getSpecs().then(specs => {
        expect(specs.default).to.be.ok();
      });
    });

    it('should accept ajax options', () => {
      let serverSettings = makeSettings();
      return Kernel.getSpecs(serverSettings).then(specs => {
        expect(specs.default).to.be.ok();
      });
    });

    it('should handle a missing default parameter', () => {
      let serverSettings = getRequestHandler(200, { 'kernelspecs': { 'python': PYTHON_SPEC } });
      return Kernel.getSpecs(serverSettings).then(specs => {
        expect(specs.default).to.be.ok();
      });
    });

    it('should throw for a missing kernelspecs parameter', (done) => {
      let serverSettings = getRequestHandler(200, { 'default': PYTHON_SPEC.name });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No kernelspecs found');
    });

    it('should omit an invalid kernelspec', () => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      let serverSettings = getRequestHandler(200, { 'default': 'python',
                               'kernelspecs': { 'R': R_SPEC,
                                                'python': PYTHON_SPEC }});
      return Kernel.getSpecs(serverSettings).then(specs => {
        expect(specs.default).to.be('python');
        expect(specs.kernelspecs['R']).to.be(void 0);
      });
    });

    it('should handle an improper name', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      let serverSettings = getRequestHandler(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper language', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.language = 1;
      let serverSettings = getRequestHandler(200, { 'default': 'R',
                             'kernelspecs': { 'R': R_SPEC } });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper argv', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.argv = 'hello';
      let serverSettings = getRequestHandler(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper display_name', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.display_name = ['hello'];
      let serverSettings = getRequestHandler(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No valid kernelspecs found');
    });

    it('should handle missing resources', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete R_SPEC.resources;
      let serverSettings = getRequestHandler(200, { 'default': 'R',
                             'kernelspecs': { 'R': R_SPEC } });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'No valid kernelspecs found');
    });

    it('should throw an error for an invalid response', (done) => {
      let serverSettings = getRequestHandler(201, { });
      let promise = Kernel.getSpecs(serverSettings);
      expectFailure(promise, done, 'Invalid response: 201 Created');
    });

  });

});
