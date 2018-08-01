// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { StateDB, PageConfig } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';

import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';

import { ServiceManager } from '@jupyterlab/services';

import {
  FileBrowserModel,
  LARGE_FILE_SIZE,
  CHUNK_SIZE
} from '@jupyterlab/filebrowser';

import {
  acceptDialog,
  dismissDialog,
  signalToPromises
} from '@jupyterlab/testutils';
import { toArray } from '@phosphor/algorithm';

describe('filebrowser/model', () => {
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FileBrowserModel;
  let name: string;
  let state: StateDB;

  before(() => {
    const opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        /* no op */
      }
    };

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManager();
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });
    state = new StateDB({ namespace: 'filebrowser/model' });
  });

  beforeEach(async () => {
    state.clear();
    model = new FileBrowserModel({ manager, state });
    const contents = await manager.newUntitled({ type: 'file' });
    name = contents.name;
    return model.cd();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('FileBrowserModel', () => {
    describe('#constructor()', () => {
      it('should construct a new file browser model', () => {
        model = new FileBrowserModel({ manager });
        expect(model).to.be.an.instanceof(FileBrowserModel);
      });
    });

    describe('#pathChanged', () => {
      it('should be emitted when the path changes', async () => {
        let called = false;
        model.pathChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.name).to.equal('path');
          expect(args.oldValue).to.equal('');
          expect(args.newValue).to.equal('src');
          called = true;
        });
        await model.cd('src');
        expect(called).to.equal(true);
      });
    });

    describe('#refreshed', () => {
      it('should be emitted after a refresh', async () => {
        let called = false;
        model.refreshed.connect((sender, arg) => {
          expect(sender).to.equal(model);
          expect(arg).to.be.undefined;
          called = true;
        });
        await model.cd();
        expect(called).to.equal(true);
      });

      it('should be emitted when the path changes', async () => {
        let called = false;
        model.refreshed.connect((sender, arg) => {
          expect(sender).to.equal(model);
          expect(arg).to.be.undefined;
          called = true;
        });
        await model.cd('src');
        expect(called).to.equal(true);
      });
    });

    describe('#fileChanged', () => {
      it('should be emitted when a file is created', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.type).to.equal('new');
          expect(args.oldValue).to.be.null;
          expect(args.newValue.type).to.equal('file');
          called = true;
        });
        await manager.newUntitled({ type: 'file' });
        expect(called).to.equal(true);
      });

      it('should be emitted when a file is renamed', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.type).to.equal('rename');
          expect(args.oldValue.path).to.equal(name);
          expect(args.newValue.path).to.equal(name + '.bak');
          called = true;
        });
        await manager.rename(name, name + '.bak');
        expect(called).to.equal(true);
      });

      it('should be emitted when a file is deleted', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.type).to.equal('delete');
          expect(args.oldValue.path).to.equal(name);
          expect(args.newValue).to.be.null;
          called = true;
        });
        await manager.deleteFile(name);
        expect(called).to.equal(true);
      });
    });

    describe('#path', () => {
      it('should be the current path of the model', async () => {
        expect(model.path).to.equal('');
        await model.cd('src/');
        expect(model.path).to.equal('src');
      });
    });

    describe('#items()', () => {
      it('should get an iterator of items in the current path', () => {
        const items = model.items();
        expect(items.next()).to.be.ok;
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the model is disposed', () => {
        expect(model.isDisposed).to.equal(false);
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });
    });

    describe('#sessions()', () => {
      it('should be the session models for the active notebooks', async () => {
        const contents = await manager.newUntitled({ type: 'notebook' });
        const session = await serviceManager.sessions.startNew({
          path: contents.path
        });
        await model.cd();
        expect(model.sessions().next()).to.be.ok;
        await session.shutdown();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });

      it('should be safe to call more than once', () => {
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });
    });

    describe('#refresh()', () => {
      it('should refresh the contents', () => {
        return model.refresh();
      });
    });

    describe('#cd()', () => {
      it('should change directory', async () => {
        await model.cd('src');
        expect(model.path).to.equal('src');
      });

      it('should accept a relative path', async () => {
        await model.cd('./src');
        expect(model.path).to.equal('src');
      });

      it('should accept a parent directory', async () => {
        await model.cd('src');
        await model.cd('..');
        expect(model.path).to.equal('');
      });
    });

    describe('#restore()', () => {
      it('should restore based on ID', async () => {
        const id = 'foo';
        const model2 = new FileBrowserModel({ manager, state });
        await model.restore(id);
        await model.cd('src');
        expect(model.path).to.equal('src');
        expect(model2.path).to.equal('');
        await model2.restore(id);
        expect(model2.path).to.equal('src');
        model2.dispose();
      });

      it('should be safe to call multiple times', async () => {
        const id = 'bar';
        const model2 = new FileBrowserModel({ manager, state });
        await model.restore(id);
        await model.cd('src');
        expect(model.path).to.equal('src');
        expect(model2.path).to.equal('');
        await model2.restore(id);
        await model2.restore(id);
        expect(model2.path).to.equal('src');
        model2.dispose();
      });
    });

    describe('#download()', () => {
      it('should download the file without error', () => {
        // TODO: how to test this?
      });
    });

    describe('#upload()', () => {
      it('should upload a file object', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).to.equal(fname);
      });

      it('should overwrite', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).to.equal(fname);
        const promise = model.upload(file);
        await acceptDialog();
        await promise;
        expect(contents.name).to.equal(fname);
      });

      it('should not overwrite', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).to.equal(fname);
        const promise = model.upload(file);
        await dismissDialog();
        try {
          await promise;
        } catch (e) {
          expect(e).to.equal('File not uploaded');
        }
      });

      it('should emit the fileChanged signal', async () => {
        const fname = UUID.uuid4() + '.html';
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.type).to.equal('save');
          expect(args.oldValue).to.be.null;
          expect(args.newValue.path).to.equal(fname);
          called = true;
        });
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        await model.upload(file);
        expect(called).to.equal(true);
      });

      describe('older notebook version', () => {
        let prevNotebookVersion: string;

        before(() => {
          prevNotebookVersion = PageConfig.setOption(
            'notebookVersion',
            JSON.stringify([5, 0, 0])
          );
        });

        it('should not upload large file', async () => {
          const fname = UUID.uuid4() + '.html';
          const file = new File([new ArrayBuffer(LARGE_FILE_SIZE + 1)], fname);
          try {
            await model.upload(file);
            throw new Error('Upload should have failed');
          } catch (err) {
            expect(err).to.equal(`Cannot upload file (>15 MB). ${fname}`);
          }
        });

        after(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });

      describe('newer notebook version', () => {
        let prevNotebookVersion: string;

        before(() => {
          prevNotebookVersion = PageConfig.setOption(
            'notebookVersion',
            JSON.stringify([5, 1, 0])
          );
        });

        it('should not upload large notebook file', async () => {
          const fname = UUID.uuid4() + '.ipynb';
          const file = new File([new ArrayBuffer(LARGE_FILE_SIZE + 1)], fname);
          try {
            await model.upload(file);
            throw Error('Upload should have failed');
          } catch (err) {
            expect(err).to.equal(`Cannot upload file (>15 MB). ${fname}`);
          }
        });

        for (const size of [
          CHUNK_SIZE - 1,
          CHUNK_SIZE,
          CHUNK_SIZE + 1,
          2 * CHUNK_SIZE
        ]) {
          it(`should upload a large file of size ${size}`, async () => {
            const fname = UUID.uuid4() + '.txt';
            const content = 'a'.repeat(size);
            const file = new File([content], fname);
            await model.upload(file);
            const contentsModel = await model.manager.services.contents.get(
              fname
            );
            expect(contentsModel.content).to.equal(content);
          });
        }
        it(`should produce progress as a large file uploads`, async () => {
          const fname = UUID.uuid4() + '.txt';
          const file = new File([new ArrayBuffer(2 * CHUNK_SIZE)], fname);

          const [start, first, second, finished] = signalToPromises(
            model.uploadChanged,
            4
          );

          model.upload(file);
          expect(toArray(model.uploads())).to.deep.equal([]);
          expect(await start).to.deep.equal([
            model,
            {
              name: 'start',
              oldValue: null,
              newValue: { path: fname, progress: 0 }
            }
          ]);
          expect(toArray(model.uploads())).to.deep.equal([
            { path: fname, progress: 0 }
          ]);
          expect(await first).to.deep.equal([
            model,
            {
              name: 'update',
              oldValue: { path: fname, progress: 0 },
              newValue: { path: fname, progress: 0 }
            }
          ]);
          expect(toArray(model.uploads())).to.deep.equal([
            { path: fname, progress: 0 }
          ]);
          expect(await second).to.deep.equal([
            model,
            {
              name: 'update',
              oldValue: { path: fname, progress: 0 },
              newValue: { path: fname, progress: 1 / 2 }
            }
          ]);
          expect(toArray(model.uploads())).to.deep.equal([
            { path: fname, progress: 1 / 2 }
          ]);
          expect(await finished).to.deep.equal([
            model,
            {
              name: 'finish',
              oldValue: { path: fname, progress: 1 / 2 },
              newValue: null
            }
          ]);
          expect(toArray(model.uploads())).to.deep.equal([]);
        });

        after(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });
    });
  });
});
