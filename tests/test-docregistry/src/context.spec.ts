// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

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
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  waitForDialog, acceptDialog, dismissDialog, createNotebookContext
} from '../../utils';

import {
  DEFAULT_CONTENT
} from '../../notebook-utils';



describe('docregistry/context', () => {

  let manager: ServiceManager.IManager;
  let factory = new TextModelFactory();

  before(() => {
    manager = new ServiceManager();
    return manager.ready;
  });

  describe('Context', () => {

    let context: Context<DocumentRegistry.IModel>;

    beforeEach(() => {
      context = new Context({ manager, factory, path: uuid() + '.txt' });
    });

    afterEach(() => {
      return context.session.shutdown().then(() => {
        context.dispose();
      });
    });

    describe('#constructor()', () => {

      it('should create a new context', () => {
        context = new Context({ manager, factory, path: uuid() + '.txt' });
        expect(context).to.be.a(Context);
      });

    });

    describe('#pathChanged', () => {

      it('should be emitted when the path changes', (done) => {
        let newPath = uuid() + '.txt';
        context.pathChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args).to.be(newPath);
          done();
        });
        context.initialize(true).then(() => {
          return manager.contents.rename(context.path, newPath);
        }).catch(done);
      });

    });

    describe('#fileChanged', () => {

      it('should be emitted when the file is saved', (done) => {
        let path = context.path;
        context.fileChanged.connect((sender, args) => {
          expect(sender).to.be(context);
          expect(args.path).to.be(path);
          done();
        });
        context.initialize(true).catch(done);
      });

    });

    describe('#isReady', () => {

      it('should indicate whether the context is ready', (done) => {
        expect(context.isReady).to.be(false);
        context.ready.then(() => {
          expect(context.isReady).to.be(true);
          done();
        }).catch(done);
        context.initialize(true).catch(done);
      });

    });

    describe('#ready()', () => {

      it('should resolve when the file is saved for the first time', async () => {
        await context.initialize(true);
        await context.ready;
      });

      it('should resolve when the file is reverted for the first time', async () => {
        manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        await context.initialize(false);
        await context.ready;
      });

      it('should initialize the model when the file is saved for the first time', async () => {
        const context = await createNotebookContext();
        context.model.fromJSON(DEFAULT_CONTENT);
        expect(context.model.cells.canUndo).to.be(true);
        await context.initialize(true);
        await context.ready;
        expect(context.model.cells.canUndo).to.be(false);
      });

      it('should initialize the model when the file is reverted for the first time', async () => {
        const context = await createNotebookContext();
        manager.contents.save(context.path, {
          type: 'notebook',
          format: 'json',
          content: DEFAULT_CONTENT
        });
        context.model.fromJSON(DEFAULT_CONTENT);
        expect(context.model.cells.canUndo).to.be(true);
        await context.initialize(false);
        await context.ready;
        expect(context.model.cells.canUndo).to.be(false);
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

    describe('#session', () => {

      it('should be a client session object', () => {
        expect(context.session.path).to.be(context.path);
      });

    });

    describe('#path', () => {

      it('should be the current path for the context', () => {
        expect(typeof context.path).to.be('string');
      });

    });

    describe('#contentsModel', () => {

      it('should be `null` before poulation', () => {
        expect(context.contentsModel).to.be(null);
      });

      it('should be set after poulation', (done) => {
        let path = context.path;
        context.ready.then(() => {
          expect(context.contentsModel.path).to.be(path);
          done();
        });
        context.initialize(true).catch(done);
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

    describe('#save()', () => {

      it('should save the contents of the file to disk', async () => {
        await context.initialize(true);
        context.model.fromString('foo');
        await context.save();
        let opts: Contents.IFetchOptions = {
          format: factory.fileFormat,
          type: factory.contentType,
          content: true
        };
        const model = await manager.contents.get(context.path, opts);
        expect(model.content).to.be('foo');
      });

    });


    describe('#saveAs()', () => {

      it('should save the document to a different path chosen by the user', () => {
        const newPath = uuid() + '.txt';
        waitForDialog().then(() => {
          let dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          let input = dialog.getElementsByTagName('input')[0];
          input.value = newPath;
          acceptDialog();
        });
        return context.initialize(true).then(() => {
          return context.saveAs();
        }).then(() => {
          expect(context.path).to.be(newPath);
        });
      });

      it('should bring up a conflict dialog', () => {
        const newPath = uuid() + '.txt';
        waitForDialog().then(() => {
          let dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          let input = dialog.getElementsByTagName('input')[0];
          input.value = newPath;
          return acceptDialog();
        }).then(() => {
          return acceptDialog();
        });
        return manager.contents.save(newPath, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        }).then(() => {
          return context.initialize(true);
        }).then(() => {
          return context.saveAs();
        }).then(() => {
          expect(context.path).to.be(newPath);
        });
      });

      it('should keep the file if overwrite is aborted', () => {
        let oldPath = context.path;
        let newPath = uuid() + '.txt';
        waitForDialog().then(() => {
          let dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          let input = dialog.getElementsByTagName('input')[0];
          input.value = newPath;
          return acceptDialog();
        }).then(() => {
          return dismissDialog();
        });
        return manager.contents.save(newPath, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        }).then(() => {
          return context.initialize(true);
        }).then(() => {
          return context.saveAs();
        }).then(() => {
          expect(context.path).to.be(oldPath);
        });
      });

      it('should just save if the file name does not change', () => {
        acceptDialog();
        let path = context.path;
        return context.initialize(true).then(() => {
          return context.saveAs();
        }).then(() => {
          expect(context.path).to.be(path);
        });
      });

    });

    describe('#revert()', () => {

      it('should revert the contents of the file to the disk', () => {
        return context.initialize(true).then(() => {
          context.model.fromString('foo');
          return context.save();
        }).then(() => {
          context.model.fromString('bar');
          return context.revert();
        }).then(() => {
          expect(context.model.toString()).to.be('foo');
        });
      });

    });

    describe('#createCheckpoint()', () => {

      it('should create a checkpoint for the file', () => {
        return context.initialize(true).then(() => {
          return context.createCheckpoint();
        }).then(model => {
          expect(model.id).to.be.ok();
          expect(model.last_modified).to.be.ok();
        });
      });

    });

    describe('#deleteCheckpoint()', () => {

      it('should delete the given checkpoint', () => {
        return context.initialize(true).then(() => {
          return context.createCheckpoint();
        }).then(model => {
          return context.deleteCheckpoint(model.id);
        }).then(() => {
          return context.listCheckpoints();
        }).then(models => {
          expect(models.length).to.be(0);
        });
      });

    });

    describe('#restoreCheckpoint()', () => {

      it('should restore the value to the last checkpoint value', () => {
        context.model.fromString('bar');
        let id = '';
        return context.initialize(true).then(() => {
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
        });
      });

    });

    describe('#listCheckpoints()', () => {

      it('should list the checkpoints for the file', () => {
        let id = '';
        return context.initialize(true).then(() => {
          context.createCheckpoint().then(model => {
            id = model.id;
            return context.listCheckpoints();
          }).then(models => {
            for (let model of models) {
              if (model.id === id) {
                return;
              }
            }
            throw new Error('Model not found');
          });
        });
      });

    });

    describe('#urlResolver', () => {

      it('should be a url resolver', () => {
        expect(context.urlResolver).to.be.a(RenderMimeRegistry.UrlResolver);
      });

    });

    describe('#addSibling()', () => {

      it('should add a sibling widget', () => {
        let called = false;
        let opener = (widget: Widget) => {
          called = true;
        };
        context = new Context({ manager, factory, path: uuid() + '.txt', opener });
        context.addSibling(new Widget());
        expect(called).to.be(true);
      });

    });

  });

});
