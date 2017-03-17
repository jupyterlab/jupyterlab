// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ServiceManager
} from '@jupyterlab/services';

import {
  Widget
} from '@phosphor/widgets';

import {
  Context, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';

import {
  waitForDialog, acceptDialog
} from '../utils';


describe('docregistry/context', () => {

  let manager: ServiceManager.IManager;
  let factory = new TextModelFactory();

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(done, done);
  });

  describe('Context', () => {

    let context: Context<DocumentRegistry.IModel>;

    beforeEach(() => {
      context = new Context({ manager, factory, path: 'foo' });
    });

    afterEach((done) => {
      if (context.kernel) {
        context.kernel.ready.then(() => {
          return context.changeKernel(null);
        }).then(() => {
          context.dispose();
        }).then(done, done);
      } else {
        context.dispose();
        done();
      }
    });

    describe('#constructor()', () => {

      it('should create a new context', () => {
        context = new Context({ manager, factory, path: 'bar' });
        expect(context).to.be.a(Context);
      });

    });

    describe('#kernelChanged', () => {

      it('should be emitted when the kernel changes', (done) => {
        let name = manager.specs.default;
        context.kernelChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args.name).to.be(name);
          done();
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
        context.save().then(() => {
          return manager.contents.rename(context.path, 'foo');
        }).catch(done);
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

    describe('#isReady', () => {

      it('should indicate whether the context is ready', (done) => {
        expect(context.isReady).to.be(false);
        context.ready.then(() => {
          expect(context.isReady).to.be(true);
          done();
        }).catch(done);
        context.save().catch(done);
      });

    });

    describe('#ready()', () => {

      it('should resolve when the file is saved for the first time', (done) => {
        context.ready.then(done, done);
        context.save().catch(done);
      });

      it('should resolve when the file is reverted for the first time', (done) => {
        manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        context.ready.then(done, done);
        context.revert().catch(done);
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
        let name = manager.specs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
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
        context.ready.then(() => {
          expect(context.contentsModel.name).to.be('foo');
          done();
        });
        context.save().catch(done);
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

    describe('#startDefaultKernel()', () => {

      it('should start the default kernel for the context', (done) => {
        context.save().then(() => {
          return context.startDefaultKernel();
        }).then(kernel => {
          expect(kernel.name).to.be.ok();
          done();
        }).catch(done);
      });

    });

    describe('#changeKernel()', () => {

      it('should change the kernel instance', (done) => {
        let name = manager.specs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
        }).then(done, done);
      });

      it('should shut down the session if given `null`', (done) => {
        let name = manager.specs.default;
        context.changeKernel({ name }).then(() => {
          expect(context.kernel.name).to.be(name);
          return context.kernel.ready;
        }).then(() => {
          return context.changeKernel(null);
        }).then(() => {
          expect(context.kernel).to.be(null);
          done();
        }).catch(done);
      });

    });

    describe('#save()', () => {

      it('should save the contents of the file to disk', (done) => {
        context.model.fromString('foo');
        context.save().then(() => {
          let opts: Contents.IFetchOptions = {
            format: factory.fileFormat,
            type: factory.contentType,
            content: true
          };
          return manager.contents.get(context.path, opts);
        }).then(model => {
          expect(model.content).to.be('foo');
          done();
        }).catch(done);
      });

    });


    describe('#saveAs()', () => {

      it('should save the document to a different path chosen by the user', (done) => {
        waitForDialog().then(() => {
          let dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          let input = dialog.getElementsByTagName('input')[0];
          input.value = 'bar';
          acceptDialog();
        });
        context.saveAs().then(() => {
          expect(context.path).to.be('bar');
          done();
        }).catch(done);
      });

    });

    describe('#revert()', () => {

      it('should revert the contents of the file to the disk', (done) => {
        manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        }).then(() => {
          context.model.fromString('bar');
          return context.revert();
        }).then(() => {
          expect(context.model.toString()).to.be('foo');
          done();
        }).catch(done);
      });

    });

    describe('#createCheckpoint()', () => {

      it('should create a checkpoint for the file', (done) => {
        context.createCheckpoint().then(model => {
          expect(model.id).to.be.ok();
          expect(model.last_modified).to.be.ok();
          done();
        }).catch(done);
      });

    });

    describe('#deleteCheckpoint()', () => {

      it('should delete the given checkpoint', (done) => {
        context.createCheckpoint().then(model => {
          return context.deleteCheckpoint(model.id);
        }).then(() => {
          return context.listCheckpoints();
        }).then(models => {
          expect(models.length).to.be(0);
          done();
        }).catch(done);
      });

    });

    describe('#restoreCheckpoint()', () => {

      it('should restore the value to the last checkpoint value', (done) => {
        context.model.fromString('bar');
        let id = '';
        context.save().then(() => {
          return context.createCheckpoint();
        }).then(model => {
          context.model.fromString('foo');
          id = model.id;
          return context.save();
        }).then(() => {
          return context.restoreCheckpoint(id);
        }).then(() => {
          return context.revert();
        }).then(() => {
          expect(context.model.toString()).to.be('bar');
          done();
        }).catch(done);
      });

    });

    describe('#listCheckpoints()', () => {

      it('should list the checkpoints for the file', (done) => {
        let id = '';
        context.createCheckpoint().then(model => {
          id = model.id;
          return context.listCheckpoints();
        }).then(models => {
          for (let model of models) {
            if (model.id === id) {
              done();
              return;
            }
          }
        }).catch(done);
      });

    });

    describe('#resolveUrl()', () => {

      it('should resolve a relative url to a correct server path', (done) => {
        context.resolveUrl('./foo').then(path => {
          expect(path).to.be('foo');
        }).then(done, done);
      });

      it('should ignore urls that have a protocol', (done) => {
        context.resolveUrl('http://foo').then(path => {
          expect(path).to.be('http://foo');
          done();
        }).catch(done);
      });

    });

    describe('#getDownloadUrl()', () => {

      it('should resolve an absolute server url to a download url', (done) => {
        let contextPromise = context.getDownloadUrl('foo');
        let contentsPromise = manager.contents.getDownloadUrl('foo');
        Promise.all([contextPromise, contentsPromise])
        .then(values => {
          expect(values[0]).to.be(values[1]);
          done();
        }).catch(done);
      });

      it('should ignore urls that have a protocol', (done) => {
        context.getDownloadUrl('http://foo').then(path => {
          expect(path).to.be('http://foo');
          done();
        }).catch(done);
      });

    });

    describe('#addSibling()', () => {

      it('should add a sibling widget', () => {
        let called = false;
        let opener = (widget: Widget) => {
          called = true;
        };
        context = new Context({ manager, factory, path: 'foo', opener });
        context.addSibling(new Widget());
        expect(called).to.be(true);
      });

    });

  });

});
