// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, IServiceManager
} from 'jupyter-js-services';

import {
  Context, DocumentRegistry, TextModelFactory
} from '../../../lib/docregistry';


describe('docregistry/context', () => {

  let manager: IServiceManager;
  let factory = new TextModelFactory();

  before((done) => {
    ServiceManager.create().then(m => {
      manager = m;
      done();
    }).catch(done);
  });

  describe('Context', () => {

    let context: Context<DocumentRegistry.IModel>;

    beforeEach(() => {
      context = new Context({ manager, factory, path: 'foo' });
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#constructor()', () => {

      it('should create a new context', () => {
        context = new Context({ manager, factory, path: 'bar' });
        expect(context).to.be.a(Context);
      });

    });

    describe('#kernelChanged', () => {

      it('should be emitted when the kernel changes', (done) => {
        let name = manager.kernelspecs.default;
        context.kernelChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args.name).to.be(name);
          context.kernel.shutdown().then(() => {
            done();
          }).catch(done);
        });
        context.changeKernel({ name });
      });

    });

    describe('#pathChanged', () => {

      it('should be emitted when the path changes', (done) => {
        context.pathChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args).to.be('foo');
          done();
        });
        context.setPath('foo');
      });

    });

    describe('#fileChanged', () => {

      it('should be emitted when the file is saved', (done) => {
        context.fileChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args.name).to.be('foo');
          done();
        });
        context.save();
      });

    });

    describe('#populated', () => {

      it('should be emitted when the file is saved for the first time', (done) => {
        let count = 0;
        context.populated.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args).to.be(void 0);
          count++;
        });
        context.save().then(() => {
          expect(count).to.be(1);
          return context.save();
        }).then(() => {
          expect(count).to.be(1);
          done();
        }).catch(done);
      });

      it('should be emitted when the file is reverted for the first time', (done) => {
        manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        let count = 0;
        context.populated.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args).to.be(void 0);
          count++;
        });
        context.revert().then(() => {
          expect(count).to.be(1);
          return context.revert();
        }).then(() => {
          expect(count).to.be(1);
          done();
        }).catch(done);
      });

    });

    describe('#disposed', () => {

      it('should be emitted when the context is disposed', (done) => {
        context.disposed.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args).to.be(void 0);
          done();
        });
        context.dispose();
      });

    });

    describe('#model', () => {

      it('should be the model associated with the document', () => {
        expect(context.model.toString()).to.be('');
      });

    });

    describe('#kernel', () => {

      it('should default to `null`', () => {
        expect(context.kernel).to.be(null);
      });

      it('should be set after switching kernels', (done) => {
        let name = manager.kernelspecs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
          return context.kernel.shutdown();
        }).then(() => {
          done();
        }).catch(done);
      });

    });

    describe('#path', () => {

      it('should be the current path for the context', () => {
        expect(context.path).to.be('foo');
      });

    });

    describe('#contentsModel', () => {

      it('should be `null` before poulation', () => {
        expect(context.contentsModel).to.be(null);
      });

      it('should be set after poulation', (done) => {
        context.populated.connect(() => {
          expect(context.contentsModel.name).to.be('foo');
          done();
        });
        context.save().catch(done);
      });

    });

    describe('#kernelspecs', () => {

      it('should be the kernelspecs model', () => {
        let name = manager.kernelspecs.default;
        expect(name in manager.kernelspecs.kernelspecs).to.be(true);
      });

    });

    describe('#isPopulated', () => {

      it('should be false before initial save', () => {
        expect(context.isPopulated).to.be(false);
      });

      it('should be true after the initial save', (done) => {
        context.save().then(() => {
          expect(context.isPopulated).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#factoryName', () => {

      it('should be the name of the factory used by the context', () => {
        expect(context.factoryName).to.be(factory.name);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the context is disposed', () => {
        expect(context.isDisposed).to.be(false);
        context.dispose();
        expect(context.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the context', () => {
        context.dispose();
        expect(context.isDisposed).to.be(true);
        context.dispose();
        expect(context.isDisposed).to.be(true);
      });

    });

    describe('#changeKernel()', () => {

      it('should change the kernel instance', (done) => {
        let name = manager.kernelspecs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
          return context.kernel.shutdown();
        }).then(() => {
          done();
        }).catch(done);
      });

      it('should shut down the session if given `null`', (done) => {
        let name = manager.kernelspecs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
          return context.changeKernel(null);
        }).then(() => {
          expect(context.kernel).to.be(null);
          done();
        }).catch(done);
      });

    });

    describe('#save()', () => {

    });

    describe('#saveAs()', () => {

    });

    describe('#revert()', () => {

    });

    describe('#createCheckpoint()', () => {

    });

    describe('#deleteCheckpoint()', () => {

    });

    describe('#restoreCheckpoint()', () => {

    });

    describe('#listCheckpoints()', () => {

    });

    describe('#listSessions()', () => {

    });

    describe('#resolveUrl()', () => {

    });

    describe('#addSibling()', () => {

    });

  });

});
