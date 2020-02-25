// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@lumino/coreutils';

import { Contents, ServiceManager } from '@jupyterlab/services';

import { Widget } from '@lumino/widgets';

import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';

import { RenderMimeRegistry } from '@jupyterlab/rendermime';

import {
  waitForDialog,
  acceptDialog,
  dismissDialog,
  initNotebookContext,
  NBTestUtils
} from '@jupyterlab/testutils';
import { SessionContext } from '@jupyterlab/apputils';

describe('docregistry/context', () => {
  let manager: ServiceManager.IManager;
  const factory = new TextModelFactory();

  beforeAll(() => {
    manager = new ServiceManager({ standby: 'never' });
    return manager.ready;
  });

  describe('Context', () => {
    let context: Context<DocumentRegistry.IModel>;

    beforeEach(() => {
      context = new Context({
        manager,
        factory,
        path: UUID.uuid4() + '.txt'
      });
    });

    afterEach(async () => {
      await context.sessionContext.shutdown();
      context.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new context', () => {
        context = new Context({
          manager,
          factory,
          path: UUID.uuid4() + '.txt'
        });
        expect(context).to.be.an.instanceof(Context);
      });
    });

    describe('#pathChanged', () => {
      it('should be emitted when the path changes', async () => {
        const newPath = UUID.uuid4() + '.txt';
        let called = false;
        context.pathChanged.connect((sender, args) => {
          expect(sender).to.equal(context);
          expect(args).to.equal(newPath);
          called = true;
        });
        await context.initialize(true);
        await manager.contents.rename(context.path, newPath);
        expect(called).to.equal(true);
      });
    });

    describe('#fileChanged', () => {
      it('should be emitted when the file is saved', async () => {
        const path = context.path;
        let called = false;
        context.fileChanged.connect((sender, args) => {
          expect(sender).to.equal(context);
          expect(args.path).to.equal(path);
          called = true;
        });
        await context.initialize(true);
        expect(called).to.equal(true);
      });
    });

    describe('#saving', () => {
      it("should emit 'starting' when the file starts saving", async () => {
        let called = false;
        let checked = false;
        context.saveState.connect((sender, args) => {
          if (!called) {
            expect(sender).to.equal(context);
            expect(args).to.equal('started');

            checked = true;
          }

          called = true;
        });

        await context.initialize(true);
        expect(called).to.be.true;
        expect(checked).to.be.true;
      });

      it("should emit 'completed' when the file ends saving", async () => {
        let called = 0;
        let checked = false;
        context.saveState.connect((sender, args) => {
          if (called > 0) {
            expect(sender).to.equal(context);
            expect(args).to.equal('completed');
            checked = true;
          }

          called += 1;
        });

        await context.initialize(true);
        expect(called).to.equal(2);
        expect(checked).to.be.true;
      });

      it("should emit 'failed' when the save operation fails out", async () => {
        context = new Context({
          manager,
          factory,
          path: 'src/readonly-temp.txt'
        });

        let called = 0;
        let checked;
        context.saveState.connect((sender, args) => {
          if (called > 0) {
            expect(sender).to.equal(context);
            checked = args;
          }

          called += 1;
        });

        try {
          await context.initialize(true);
        } catch (err) {
          expect(err.message).to.contain('Invalid response: 403 Forbidden');
        }

        expect(called).to.equal(2);
        expect(checked).to.equal('failed');

        await acceptDialog();
      });
    });

    describe('#isReady', () => {
      it('should indicate whether the context is ready', async () => {
        expect(context.isReady).to.equal(false);
        const func = async () => {
          await context.ready;
          expect(context.isReady).to.equal(true);
        };
        const promise = func();
        await context.initialize(true);
        await promise;
      });
    });

    describe('#ready()', () => {
      it('should resolve when the file is saved for the first time', async () => {
        await context.initialize(true);
        await context.ready;
      });

      it('should resolve when the file is reverted for the first time', async () => {
        await manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        await context.initialize(false);
        await context.ready;
      });

      it('should initialize the model when the file is saved for the first time', async () => {
        const context = await initNotebookContext();
        context.model.fromJSON(NBTestUtils.DEFAULT_CONTENT);
        expect(context.model.cells.canUndo).to.equal(true);
        await context.initialize(true);
        await context.ready;
        expect(context.model.cells.canUndo).to.equal(false);
      });

      it('should initialize the model when the file is reverted for the first time', async () => {
        const context = await initNotebookContext();
        await manager.contents.save(context.path, {
          type: 'notebook',
          format: 'json',
          content: NBTestUtils.DEFAULT_CONTENT
        });
        context.model.fromJSON(NBTestUtils.DEFAULT_CONTENT);
        expect(context.model.cells.canUndo).to.equal(true);
        await context.initialize(false);
        await context.ready;
        expect(context.model.cells.canUndo).to.equal(false);
      });
    });

    describe('#disposed', () => {
      it('should be emitted when the context is disposed', () => {
        let called = false;
        context.disposed.connect((sender, args) => {
          expect(sender).to.equal(context);
          expect(args).to.be.undefined;
          called = true;
        });
        context.dispose();
        expect(called).to.equal(true);
      });
    });

    describe('#model', () => {
      it('should be the model associated with the document', () => {
        expect(context.model.toString()).to.equal('');
      });
    });

    describe('#sessionContext', () => {
      it('should be a ISessionContext object', () => {
        expect(context.sessionContext).to.be.instanceOf(SessionContext);
      });
    });

    describe('#path', () => {
      it('should be the current path for the context', () => {
        expect(typeof context.path).to.equal('string');
      });
    });

    describe('#contentsModel', () => {
      it('should be `null` before population', () => {
        expect(context.contentsModel).to.be.null;
      });

      it('should be set after population', async () => {
        const { path } = context;

        void context.initialize(true);
        await context.ready;
        expect(context.contentsModel!.path).to.equal(path);
      });
    });

    describe('#factoryName', () => {
      it('should be the name of the factory used by the context', () => {
        expect(context.factoryName).to.equal(factory.name);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the context is disposed', () => {
        expect(context.isDisposed).to.equal(false);
        context.dispose();
        expect(context.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the context', () => {
        context.dispose();
        expect(context.isDisposed).to.equal(true);
        context.dispose();
        expect(context.isDisposed).to.equal(true);
      });
    });

    describe('#save()', () => {
      it('should save the contents of the file to disk', async () => {
        await context.initialize(true);
        context.model.fromString('foo');
        await context.save();

        const opts: Contents.IFetchOptions = {
          format: factory.fileFormat,
          type: factory.contentType,
          content: true
        };
        const model = await manager.contents.get(context.path, opts);

        expect(model.content).to.equal('foo');
      });

      it('should should preserve LF line endings upon save', async () => {
        await context.initialize(true);
        await manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo\nbar'
        });
        await context.revert();
        await context.save();
        const opts: Contents.IFetchOptions = {
          format: factory.fileFormat,
          type: factory.contentType,
          content: true
        };
        const model = await manager.contents.get(context.path, opts);
        expect(model.content).to.equal('foo\nbar');
      });

      it('should should preserve CRLF line endings upon save', async () => {
        await context.initialize(true);
        await manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo\r\nbar'
        });
        await context.revert();
        await context.save();
        const opts: Contents.IFetchOptions = {
          format: factory.fileFormat,
          type: factory.contentType,
          content: true
        };
        const model = await manager.contents.get(context.path, opts);
        expect(model.content).to.equal('foo\r\nbar');
      });
    });

    describe('#saveAs()', () => {
      it('should save the document to a different path chosen by the user', async () => {
        const initialize = context.initialize(true);
        const newPath = UUID.uuid4() + '.txt';

        const func = async () => {
          await initialize;
          await waitForDialog();
          const dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          const input = dialog.getElementsByTagName('input')[0];

          input.value = newPath;
          await acceptDialog();
        };
        const promise = func();
        await initialize;
        await context.saveAs();
        expect(context.path).to.equal(newPath);
        await promise;
      });

      it('should bring up a conflict dialog', async () => {
        const newPath = UUID.uuid4() + '.txt';

        const func = async () => {
          await waitForDialog();
          const dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          const input = dialog.getElementsByTagName('input')[0];
          input.value = newPath;
          await acceptDialog(); // Accept rename dialog
          await acceptDialog(); // Accept conflict dialog
        };
        await manager.contents.save(newPath, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        await context.initialize(true);
        const promise = func();
        await context.saveAs();
        await promise;
        expect(context.path).to.equal(newPath);
      });

      it('should keep the file if overwrite is aborted', async () => {
        const oldPath = context.path;
        const newPath = UUID.uuid4() + '.txt';
        const func = async () => {
          await waitForDialog();
          const dialog = document.body.getElementsByClassName('jp-Dialog')[0];
          const input = dialog.getElementsByTagName('input')[0];
          input.value = newPath;
          await acceptDialog(); // Accept rename dialog
          await dismissDialog(); // Reject conflict dialog
        };
        await manager.contents.save(newPath, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo'
        });
        await context.initialize(true);
        const promise = func();
        await context.saveAs();
        await promise;
        expect(context.path).to.equal(oldPath);
      });

      it('should just save if the file name does not change', async () => {
        const path = context.path;
        await context.initialize(true);
        const promise = context.saveAs();
        await acceptDialog();
        await promise;
        expect(context.path).to.equal(path);
      });
    });

    describe('#revert()', () => {
      it('should revert the contents of the file to the disk', async () => {
        await context.initialize(true);
        context.model.fromString('foo');
        await context.save();
        context.model.fromString('bar');
        await context.revert();
        expect(context.model.toString()).to.equal('foo');
      });

      it('should normalize CRLF line endings to LF', async () => {
        await context.initialize(true);
        await manager.contents.save(context.path, {
          type: factory.contentType,
          format: factory.fileFormat,
          content: 'foo\r\nbar'
        });
        await context.revert();
        expect(context.model.toString()).to.equal('foo\nbar');
      });
    });

    describe('#createCheckpoint()', () => {
      it('should create a checkpoint for the file', async () => {
        await context.initialize(true);
        const model = await context.createCheckpoint();
        expect(model.id).to.be.ok;
        expect(model.last_modified).to.be.ok;
      });
    });

    describe('#deleteCheckpoint()', () => {
      it('should delete the given checkpoint', async () => {
        await context.initialize(true);
        const model = await context.createCheckpoint();
        await context.deleteCheckpoint(model.id);
        const models = await context.listCheckpoints();
        expect(models.length).to.equal(0);
      });
    });

    describe('#restoreCheckpoint()', () => {
      it('should restore the value to the last checkpoint value', async () => {
        context.model.fromString('bar');
        await context.initialize(true);
        const model = await context.createCheckpoint();
        context.model.fromString('foo');
        const id = model.id;
        await context.save();
        await context.restoreCheckpoint(id);
        await context.revert();
        expect(context.model.toString()).to.equal('bar');
      });
    });

    describe('#listCheckpoints()', () => {
      it('should list the checkpoints for the file', async () => {
        await context.initialize(true);
        const model = await context.createCheckpoint();
        const id = model.id;
        const models = await context.listCheckpoints();
        let found = false;
        for (const model of models) {
          if (model.id === id) {
            found = true;
          }
        }
        expect(found).to.equal(true);
      });
    });

    describe('#urlResolver', () => {
      it('should be a url resolver', () => {
        expect(context.urlResolver).to.be.an.instanceof(
          RenderMimeRegistry.UrlResolver
        );
      });
    });

    describe('#addSibling()', () => {
      it('should add a sibling widget', () => {
        let called = false;
        const opener = (widget: Widget) => {
          called = true;
        };
        context = new Context({
          manager,
          factory,
          path: UUID.uuid4() + '.txt',
          opener
        });
        context.addSibling(new Widget());
        expect(called).to.equal(true);
      });
    });
  });
});
