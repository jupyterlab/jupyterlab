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
  uuid, copy
} from '../../../lib/utils';

import {
  KernelManager, Kernel
} from '../../../lib/kernel';

import {
  KernelTester, KERNEL_OPTIONS, PYTHON_SPEC, KERNELSPECS
} from '../utils';



let PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';


describe('kernel/manager', () => {

  let tester: KernelTester;
  let manager: KernelManager;
  let data: Kernel.IModel[];

  beforeEach((done) => {
    tester = new KernelTester();
    data = [{ id: uuid(), name: 'test' },
            { id: uuid(), name: 'test2' }];
    tester.runningKernels = data;
    manager = new KernelManager();
    expect(manager.specs).to.be(null);
    expect(manager.running().next()).to.be(void 0);
    manager.ready.then(done, done);
  });

  afterEach((done) => {
    manager.ready.then(() => {
      manager.dispose();
      tester.dispose();
      done();
    }).catch(done);
  });

  describe('KernelManager', () => {

    describe('#constructor()', () => {

      it('should take the options as an argument', () => {
        manager.dispose();
        manager = new KernelManager(KERNEL_OPTIONS);
        expect(manager instanceof KernelManager).to.be(true);
      });

    });

    describe('#baseUrl', () => {

      it('should get the base url of the server', () => {
        manager.dispose();
        manager = new KernelManager({ baseUrl: 'foo' });
        expect(manager.baseUrl).to.be('foo');
      });

    });

    describe('#wsUrl', () => {

      it('should get the ws url of the server', () => {
        manager.dispose();
        manager = new KernelManager({ wsUrl: 'bar' });
        expect(manager.wsUrl).to.be('bar');
      });

    });

    describe('#ajaxSettings', () => {

      it('should get the ajax sessions of the server', () => {
        manager.dispose();
        let ajaxSettings = { withCredentials: true };
        manager = new KernelManager({ ajaxSettings });
        expect(manager.ajaxSettings).to.eql(ajaxSettings);
      });

    });

    describe('#specs', () => {

      it('should get the kernel specs', () => {
        expect(manager.specs.default).to.be(KERNELSPECS.default);
      });

    });

    describe('#running()', () => {

      it('should get the running sessions', () => {
        let test = JSONExt.deepEqual(toArray(data), toArray(manager.running()));
        expect(test).to.be(true);
      });

    });

    describe('#specsChanged', () => {

      it('should be emitted when the specs change', (done) => {
        let specs = copy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        tester.specs = specs;
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
        data = [{ id: uuid(), name: 'test' }];
        tester.runningKernels = data;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(JSONExt.deepEqual(toArray(args), data)).to.be(true);
          done();
        });
        manager.refreshRunning();
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

      it('should test whether the manager is ready', (done) => {
        manager.dispose();
        manager = new KernelManager();
        expect(manager.isReady).to.be(false);
        manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', (done) => {
        manager.ready.then(done, done);
      });

    });

    describe('#refreshSpecs()', () => {

      it('should update list of kernel specs', (done) => {
        let specs = copy(KERNELSPECS) as Kernel.ISpecModels;
        specs.default = 'shell';
        tester.specs = specs;
        manager.refreshSpecs().then(() => {
          expect(manager.specs.default).to.be(specs.default);
          done();
        }).catch(done);
      });

    });

    describe('#refreshRunning()', () => {

      it('should update the running kernels', (done) => {
        data = [{ id: uuid(), name: 'test' }];
        tester.runningKernels = data;
        manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(running[0]).to.eql(data[0]);
          expect(running[1]).to.be(void 0);
          done();
        });
      });

    });

    describe('#startNew()', () => {

      it('should start a new kernel', (done) => {
        manager.startNew().then(kernel => {
          expect(kernel.status).to.be('unknown');
          kernel.statusChanged.connect(() => {
            if (kernel.status === 'starting') {
              kernel.shutdown().then(done, done);
            }
          });
        });

      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        manager.startNew();
      });

    });

    describe('#findById()', () => {

      it('should find an existing kernel by id', (done) => {
        let id = uuid();
        tester.runningKernels = [{ name: 'foo', id }];
        manager.findById(id).then(model => {
          expect(model.name).to.be('foo');
          expect(model.id).to.be(id);
        }).then(done, done);
      });

    });

    describe('#connectTo()', () => {

      it('should connect to an existing kernel', (done) => {
        let id = uuid();
        tester.runningKernels = [{ name: 'foo', id }];
        return manager.connectTo(id).then(kernel => {
          expect(kernel.name).to.be('foo');
          expect(kernel.id).to.be(id);
          return kernel.shutdown();
        }).then(done, done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        let id = uuid();
        tester.runningKernels = [{ name: 'foo', id }];
        manager.connectTo(id);
      });

    });

    describe('shutdown()', () => {

      it('should shut down a kernel by id', (done) => {
        manager.shutdown('foo').then(done, done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect((sender, args) => {
          done();
        });
        manager.shutdown(data[0].id);
      });

    });

  });

});

