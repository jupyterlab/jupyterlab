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

    });

    describe('#isPopulated', () => {

    });

    describe('#factoryName', () => {

    });

    describe('#isDisposed', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#changeKernel()', () => {

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
