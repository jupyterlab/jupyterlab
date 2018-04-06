// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  StateDB, uuid, PageConfig
} from '@jupyterlab/coreutils';

import {
  DocumentManager, IDocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';

import {
  ServiceManager, Session
} from '@jupyterlab/services';

import {
  FileBrowserModel, LARGE_FILE_SIZE, CHUNK_SIZE
} from '@jupyterlab/filebrowser';

import {
  acceptDialog, dismissDialog
} from '../../utils';
import { ISignal } from '@phosphor/signaling';
import { IIterator } from '@phosphor/algorithm';


describe('filebrowser/model', () => {

  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FileBrowserModel;
  let name: string;
  let state: StateDB;

  before(() => {
    let opener: DocumentManager.IWidgetOpener = {
      open: widget => { /* no op */ }
    };

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManager();
    manager = new DocumentManager({
      registry, opener,
      manager: serviceManager
    });
    state = new StateDB({ namespace: 'filebrowser/model' });
  });

  beforeEach(() => {
    state.clear();
    model = new FileBrowserModel({ manager, state });
    return manager.newUntitled({ type: 'file' }).then(contents => {
      name = contents.name;
      return model.cd();
    });
  });

  afterEach(() => {
    model.dispose();
  });

  describe('FileBrowserModel', () => {

    describe('#constructor()', () => {

      it('should construct a new file browser model', () => {
        model = new FileBrowserModel({ manager });
        expect(model).to.be.a(FileBrowserModel);
      });

    });

    describe('#pathChanged', () => {

      it('should be emitted when the path changes', (done) => {
        model.pathChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('path');
          expect(args.oldValue).to.be('');
          expect(args.newValue).to.be('src');
          done();
        });
        model.cd('src').catch(done);
      });

    });

    describe('#refreshed', () => {

      it('should be emitted after a refresh', (done) => {
        model.refreshed.connect((sender, arg) => {
          expect(sender).to.be(model);
          expect(arg).to.be(void 0);
          done();
        });
        model.cd().catch(done);
      });

      it('should be emitted when the path changes', (done) => {
        model.refreshed.connect((sender, arg) => {
          expect(sender).to.be(model);
          expect(arg).to.be(void 0);
          done();
        });
        model.cd('src').catch(done);
      });

    });

    describe('#fileChanged', () => {

      it('should be emitted when a file is created', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('new');
          expect(args.oldValue).to.be(null);
          expect(args.newValue.type).to.be('file');
          done();
        });
        manager.newUntitled({ type: 'file' }).catch(done);
      });

      it('should be emitted when a file is renamed', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('rename');
          expect(args.oldValue.path).to.be(name);
          expect(args.newValue.path).to.be(name + '.bak');
          done();
        });
        manager.rename(name, name + '.bak').catch(done);
      });

      it('should be emitted when a file is deleted', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('delete');
          expect(args.oldValue.path).to.be(name);
          expect(args.newValue).to.be(null);
          done();
        });
        manager.deleteFile(name).catch(done);
      });

    });

    describe('#path', () => {

      it('should be the current path of the model', (done) => {
        expect(model.path).to.be('');
        model.cd('src/').then(() => {
          expect(model.path).to.be('src');
          done();
        }).catch(done);
      });

    });

    describe('#items()', () => {

      it('should get an iterator of items in the current path', () => {
        let items = model.items();
        expect(items.next()).to.be.ok();
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the model is disposed', () => {
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#sessions()', () => {

      it('should be the session models for the active notebooks', (done) => {
        let session: Session.ISession;
        manager.newUntitled({ type: 'notebook' }).then(contents => {
          return serviceManager.sessions.startNew({ path: contents.path });
        }).then(s => {
          session = s;
          return model.cd();
        }).then(() => {
          expect(model.sessions().next()).to.be.ok();
          return session.shutdown();
        }).then(() => {
          done();
        }).catch(done);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#refresh()', () => {

      it('should refresh the contents', (done) => {
        model.refresh().then(done, done);
      });

    });

    describe('#cd()', () => {

      it('should change directory', (done) => {
        model.cd('src').then(() => {
          expect(model.path).to.be('src');
          done();
        }).catch(done);
      });

      it('should accept a relative path', (done) => {
        model.cd('./src').then(() => {
          expect(model.path).to.be('src');
          done();
        }).catch(done);
      });

      it('should accept a parent directory', (done) => {
        model.cd('src').then(() => {
          return model.cd('..');
        }).then(() => {
          expect(model.path).to.be('');
          done();
        }).catch(done);
      });

    });

    describe('#restore()', () => {

      it('should restore based on ID', (done) => {
        const id = 'foo';
        const model2 = new FileBrowserModel({ manager, state });
        model.restore(id)
          .then(() => model.cd('src'))
          .then(() => { expect(model.path).to.be('src'); })
          .then(() => { expect(model2.path).to.be(''); })
          .then(() => model2.restore(id))
          .then(() => { expect(model2.path).to.be('src'); })
          .then(() => {
            model2.dispose();
            done();
          }).catch(done);
      });

      it('should be safe to call multiple times', (done) => {
        const id = 'bar';
        const model2 = new FileBrowserModel({ manager, state });
        model.restore(id)
          .then(() => model.cd('src'))
          .then(() => { expect(model.path).to.be('src'); })
          .then(() => { expect(model2.path).to.be(''); })
          .then(() => model2.restore(id))
          .then(() => model2.restore(id))
          .then(() => { expect(model2.path).to.be('src'); })
          .then(() => {
            model2.dispose();
            done();
          }).catch(done);
      });

    });

    describe('#download()', () => {

      it('should download the file without error', () => {
        // TODO: how to test this?
      });

    });

    describe('#upload()', () => {

      it('should upload a file object', (done) => {
        let fname = uuid() + '.html';
        let file = new File(['<p>Hello world!</p>'], fname,
                            { type: 'text/html' });
        model.upload(file).then(contents => {
          expect(contents.name).to.be(fname);
          done();
        }).catch(done);
      });

      it('should overwrite', () => {
        let fname = uuid() + '.html';
        let file = new File(['<p>Hello world!</p>'], fname,
                            { type: 'text/html' });
        return model.upload(file).then(contents => {
          expect(contents.name).to.be(fname);
          acceptDialog();
          return model.upload(file);
        }).then(contents => {
          expect(contents.name).to.be(fname);
        });
      });

      it('should not overwrite', () => {
        let fname = uuid() + '.html';
        let file = new File(['<p>Hello world!</p>'], fname,
                            { type: 'text/html' });
        return model.upload(file).then(contents => {
          expect(contents.name).to.be(fname);
          dismissDialog();
          return model.upload(file);
        }).catch(err => {
          expect(err).to.be('File not uploaded');
        });
      });

      it('should emit the fileChanged signal', (done) => {
        let fname = uuid() + '.html';
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('save');
          expect(args.oldValue).to.be(null);
          expect(args.newValue.path).to.be(fname);
          done();
        });
        let file = new File(['<p>Hello world!</p>'], fname,
                            { type: 'text/html' });
        model.upload(file).catch(done);
      });

      describe('older notebook version', () => {
        let prevNotebookVersion: string;

        before(() => {
          prevNotebookVersion = PageConfig.setOption('notebookVersion', JSON.stringify([5, 0, 0]));
        });

        it('should not upload large file', () => {
          const fname = uuid() + '.html';
          const file = new File([new ArrayBuffer(LARGE_FILE_SIZE + 1)], fname);
          return model.upload(file).then(() => {
            expect().fail('Upload should have failed');
          }).catch(err => {
            expect(err).to.be(`Cannot upload file (>15 MB). ${fname}`);
          });
        });

        after(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });

      describe('newer notebook version', () => {
        let prevNotebookVersion: string;

        before(() => {
          prevNotebookVersion = PageConfig.setOption('notebookVersion', JSON.stringify([5, 1, 0]));
        });

        it('should not upload large notebook file', () => {
          const fname = uuid() + '.ipynb';
          const file = new File([new ArrayBuffer(LARGE_FILE_SIZE + 1)], fname);
          return model.upload(file).then(() => {
            expect().fail('Upload should have failed');
          }).catch(err => {
            expect(err).to.be(`Cannot upload file (>15 MB). ${fname}`);
          });
        });

        for (const size of [CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 2 * CHUNK_SIZE]) {
          it(`should upload a large file of size ${size}`, async () => {
            const fname = uuid() + '.txt';
            const content = 'a'.repeat(size);
            const file = new File([content], fname);
            await model.upload(file);
            const contentsModel = await model.manager.services.contents.get(fname);
            expect(contentsModel.content).to.be(content);
          });
        }
        it(`should produce progress as a large file uploads`, async () => {
          const fname = uuid() + '.txt';
          const file = new File([new ArrayBuffer(2 * CHUNK_SIZE)], fname);

          const {cleanup, values: [start, first, second, finished]} = signalToPromises(model.uploadChanged, 4);

          model.upload(file);
          expect(iteratorToList(model.uploads())).to.eql([]);
          expect(await start).to.eql([model, {name: 'start', oldValue: null, newValue: {path: fname, progress: 0}}]);
          expect(iteratorToList(model.uploads())).to.eql([{path: fname, progress: 0}]);
          expect(await first).to.eql([model, {name: 'update', oldValue: {path: fname, progress: 0}, newValue: {path: fname, progress: 0}}]);
          expect(iteratorToList(model.uploads())).to.eql([{path: fname, progress: 0}]);
          expect(await second).to.eql([model, {name: 'update', oldValue: {path: fname, progress: 0}, newValue: {path: fname, progress: 1 / 2}}]);
          expect(iteratorToList(model.uploads())).to.eql([{path: fname, progress: 1 / 2}]);
          expect(await finished).to.eql([model, {name: 'finish', oldValue: {path: fname, progress: 1 / 2}, newValue: null}]);
          expect(iteratorToList(model.uploads())).to.eql([]);
          cleanup();
        });

        after(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });

    });

  });

});

/**
 * Creates a number of promises from a signal, which each resolve to the successive values in the signal.
 */
function signalToPromises<T, U>(signal: ISignal<T, U>, numberValues: number): {values: Promise<[T, U]>[], cleanup: () => void} {
  const values: Promise<[T, U]>[] = new Array(numberValues);
  const resolvers: Array<((value: [T, U]) => void)> = new Array(numberValues);

  for (let i = 0; i < numberValues; i++) {
    values[i] = new Promise<[T, U]>(resolve => {
      resolvers[i] = resolve;
    });
  }

  let current = 0;
  function slot(sender: T, args: U) {
    resolvers[current++]([sender, args]);
  }
  signal.connect(slot);

  function cleanup() {
    signal.disconnect(slot);
  }
  return {values, cleanup};
}


/**
 * Convert an IIterator into a list.
 */
function iteratorToList<T>(i: IIterator<T>): T[] {
  const a: T[] = [];
  for (let v = i.next(); v !== undefined; v = i.next()) {
    a.push(v);
  }
  return a;
}
