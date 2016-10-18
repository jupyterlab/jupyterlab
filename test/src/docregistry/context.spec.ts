// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ServiceManager, IServiceManager
} from '@jupyterlab/services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  Context, DocumentRegistry, TextModelFactory
} from '../../../lib/docregistry';

import {
  waitForDialog, acceptDialog
} from '../utils';


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
          context.changeKernel(null).then(() => {
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
          return context.changeKernel(null);
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
          return context.changeKernel(null);
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

    describe('#listSessions()', () => {

      it('should list the running sessions', (done) => {
        let name = manager.kernelspecs.default;
        context.changeKernel({ name }).then(() => {
          return context.listSessions();
        }).then(models => {
          for (let model of models) {
            if (model.kernel.id === context.kernel.id) {
              return context.changeKernel(null);
            }
          }
        }).then(() => {
          done();
        }).catch(done);
      });

    });

    describe('#resolveUrl()', () => {

      it('should resolve a relative url to a correct server path', () => {
        let path = context.resolveUrl('./foo');
        expect(path).to.be(manager.contents.getDownloadUrl('foo'));
      });

      it('should ignore urls that have a protocol', () => {
        let path = context.resolveUrl('http://foo');
        expect(path).to.be('http://foo');
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
