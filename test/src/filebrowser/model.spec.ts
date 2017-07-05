// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  StateDB
} from '@jupyterlab/coreutils';

import {
  DocumentManager, IDocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ServiceManager, Session
} from '@jupyterlab/services';

import {
  FileBrowserModel
} from '@jupyterlab/filebrowser';


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

    registry = new DocumentRegistry();
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
        let file = new File(['<p>Hello world!</p>'], 'hello.html',
                            { type: 'text/html' });
        model.upload(file).then(contents => {
          expect(contents.name).to.be('hello.html');
          done();
        }).catch(done);
      });

      it('should allow overwrite', (done) => {
        let file = new File(['<p>Hello world!</p>'], 'hello2.html',
                            { type: 'text/html' });
        model.upload(file).then(contents => {
          expect(contents.name).to.be('hello2.html');
          return model.upload(file, true);
        }).then(contents => {
          expect(contents.name).to.be('hello2.html');
          done();
        }).catch(done);
      });

      it('should fail without an overwrite if the file exists', (done) => {
        let file = new File(['<p>Hello world!</p>'], 'hello2.html',
                            { type: 'text/html' });
        model.upload(file).then(contents => {
          expect(contents.name).to.be('hello2.html');
          return model.upload(file);
        }).catch(err => {
          expect(err.message).to.be(`"${file.name}" already exists`);
          done();
        });
      });

      it('should emit the fileChanged signal', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('save');
          expect(args.oldValue).to.be(null);
          expect(args.newValue.path).to.be('hello3.html');
          done();
        });
        let file = new File(['<p>Hello world!</p>'], 'hello3.html',
                            { type: 'text/html' });
        model.upload(file).catch(done);
      });

    });

  });

});
