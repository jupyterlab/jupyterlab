// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  KernelManager, Kernel
} from '../../../lib/kernel';

import {
  PYTHON_SPEC, KERNELSPECS, handleRequest, makeSettings, testEmission
} from '../utils';



let PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';


describe('kernel/manager', () => {

  let manager: KernelManager;
  let specs: Kernel.ISpecModels;
  let kernel: Kernel.IKernel;

  before(() => {
    return Kernel.getSpecs().then(s => {
      specs = s;
      return Kernel.startNew();
    }).then(k => {
      kernel = k;
    });
  });

  beforeEach(() => {
    manager = new KernelManager();
    expect(manager.specs).to.be(null);
    return manager.ready;
  });

  afterEach(() => {
    manager.dispose();
  });

  after(() => {
    return Kernel.shutdownAll();
  });

  describe('KernelManager', () => {

    describe('#constructor()', () => {

      it('should take the options as an argument', () => {
        manager.dispose();
        manager = new KernelManager({ serverSettings: makeSettings() });
        expect(manager instanceof KernelManager).to.be(true);
      });

    });

    describe('#serverSettings', () => {

      it('should get the server settings', () => {
        manager.dispose();
        let serverSettings = makeSettings();
        let token = serverSettings.token;
        manager = new KernelManager({ serverSettings });
        expect(manager.serverSettings.token).to.be(token);
      });

    });

    describe('#specs', () => {

      it('should get the kernel specs', () => {
        return manager.ready.then(() => {
          expect(manager.specs.default).to.be.ok();
        });
      });

    });

    describe('#running()', () => {

      it('should get the running sessions', () => {
        return manager.refreshRunning().then(() => {
          expect(toArray(manager.running()).length).to.be.greaterThan(0);
        });
      });

    });

    describe('#specsChanged', () => {

      it('should be emitted when the specs change', (done) => {
        let specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        manager.specsChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(args.default).to.be(specs.default);
          done();
        });
        manager.refreshSpecs();
      });

    });

    describe('#runningChanged', () => {

      it('should be emitted in refreshRunning when the running kernels changed', (done) => {
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(toArray(args).length).to.be.greaterThan(0);
          done();
        });
        Kernel.startNew().then(() => {
          return manager.refreshRunning();
        }).catch(done);
      });

      it('should be emitted when a kernel is shut down', (done) => {
        manager.startNew().then(kernel => {
          manager.runningChanged.connect(() => {
            manager.dispose();
            done();
          });
          return kernel.shutdown();
        }).catch(done);
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', () => {
        manager.dispose();
        manager = new KernelManager();
        expect(manager.isReady).to.be(false);
        return manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
        });
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });

    });

    describe('#refreshSpecs()', () => {

      it('should update list of kernel specs', () => {
        let specs = JSONExt.deepCopy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        handleRequest(manager, 200, specs);
        return manager.refreshSpecs().then(() => {
          expect(manager.specs.default).to.be(specs.default);
        });
      });

    });

    describe('#refreshRunning()', () => {

      it('should update the running kernels', () => {
        return manager.refreshRunning().then(() => {
          expect(toArray(manager.running()).length).to.be.greaterThan(0);
        });
      });

    });

    describe('#startNew()', () => {

      it('should start a new kernel', () => {
        return manager.startNew();
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        manager.startNew().catch(done);
      });

    });

    describe('#findById()', () => {

      it('should find an existing kernel by id', () => {
        let id = kernel.id;
        return manager.findById(id).then(model => {
          expect(model.id).to.be(id);
        });
      });

    });

    describe('#connectTo()', () => {

      it('should connect to an existing kernel', () => {
        let id = kernel.id;
        return manager.connectTo(kernel.model).then(kernel => {
          expect(kernel.model.id).to.be(id);
        });
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        Kernel.startNew().then(k => {
          return manager.connectTo(k.model);
        }).catch(done);
      });

    });

    describe('shutdown()', () => {

      it('should shut down a kernel by id', async () => {
        let kernel = await manager.startNew();
        await kernel.ready;
        await manager.shutdown(kernel.id);
        expect(kernel.isDisposed).to.be(true);
      });

      it('should emit a runningChanged signal', async () => {
        let kernel = await manager.startNew();
        const emission = testEmission(manager.runningChanged, {
          test: () => {
            expect(kernel.isDisposed).to.be(false);
          }
        });
        await manager.shutdown(kernel.id);
        await emission;
      });

    });

  });

});

