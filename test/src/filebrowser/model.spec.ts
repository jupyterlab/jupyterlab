// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, Session
} from '@jupyterlab/services';

import {
  toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  FileBrowserModel
} from '../../../lib/filebrowser';


describe('filebrowser/model', () => {

  let manager: ServiceManager.IManager;
  let model: FileBrowserModel;
  let name: string;

  before((done) => {
    ServiceManager.create().then(m => {
      manager = m;
      done();
    });
  });

  beforeEach((done) => {
    model = new FileBrowserModel({ manager });
    model.newUntitled({ type: 'file' }).then(contents => {
      name = contents.name;
      return model.refresh();
    }).then(done, done);
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
        model.refresh().catch(done);
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
          expect(args.name).to.be('file');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue.type).to.be('file');
          done();
        });
        model.newUntitled({ type: 'file' }).catch(done);
      });

      it('should be emitted when a file is renamed', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('file');
          expect(args.oldValue.path).to.be(name);
          expect(args.newValue.path).to.be(name + '.bak');
          done();
        });
        model.rename(name, name + '.bak').catch(done);
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
        model.newUntitled({ type: 'notebook' }).then(contents => {
          return manager.sessions.startNew({ path: contents.path });
        }).then(s => {
          session = s;
          return model.refresh();
        }).then(() => {
          expect(model.sessions().next).to.be.ok();
          return session.shutdown();
        }).then(() => {
          done();
        }).catch(done);
      });

    });

    describe('#kernelspecs', () => {

      it('should get the kernelspecs models', () => {
        expect(model.kernelspecs.default).to.be(manager.kernelspecs.default);
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

    describe('#refresh()', () => {

      it('should refresh the current directory', (done) => {
        let len = toArray(model.items()).length;
        model.newUntitled({ type: 'file' }).then(contents => {
          expect(toArray(model.items()).length).to.be(len);
          return model.refresh();
        }).then(() => {
          expect(toArray(model.items()).length).to.be(len + 1);
          done();
        }).catch(done);
      });

    });

    describe('#copy()', () => {

      it('should copy a file', (done) => {
        model.copy(name, 'src').then(contents => {
          expect(contents.path).to.be(`src/${name}`);
          done();
        }).catch(done);
      });

      it('should emit a fileChanged signal', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('file');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue.path).to.be(`src/${name}`);
          done();
        });
        model.copy(name, 'src').catch(done);
      });

    });

    describe('#deleteFile()', () => {

      it('should delete a file ', (done) => {
        let len = toArray(model.items()).length;
        model.deleteFile(name).then(() => {
          return model.refresh();
        }).then(() => {
          expect(toArray(model.items()).length).to.be(len - 1);
          done();
        }).catch(done);
      });

      it('should emit a fileChanged signal', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('file');
          expect(args.oldValue.path).to.be(name);
          expect(args.newValue).to.be(void 0);
          done();
        });
        model.deleteFile(name).catch(done);
      });

    });

    describe('#download()', () => {

      it('should download the file without error', () => {
        // TODO: how to test this?
      });

    });

    describe('#newUntitled()', () => {

      it('should create a new untitled file in the current directory', (done) => {
        model.cd('src').then(() => {
          return model.newUntitled({ type: 'file', ext: '.py' });
        }).then(contents => {
          expect(contents.path.indexOf('src/')).to.be(0);
          expect(contents.path.indexOf('.py')).to.not.be(-1);
          done();
        }).catch(done);
      });

      it('should emit a fileChanged signal', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('file');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue.type).to.be('directory');
          done();
        });
        model.newUntitled({ type: 'directory' }).catch(done);
      });

    });

    describe('#rename()', () => {

      it('should rename a file', (done) => {
        model.rename(name, name + '.bak').then(contents => {
          expect(contents.name).to.be(name + '.bak');
          done();
        }).catch(done);
      });

      it('should emit the fileChanged signal', (done) => {
        model.fileChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('file');
          expect(args.oldValue.path).to.be(name);
          expect(args.newValue.path).to.be(name + '.new');
          done();
        });
        model.rename(name, name + '.new').catch(done);
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
          expect(args.name).to.be('file');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue.path).to.be('hello3.html');
          done();
        });
        let file = new File(['<p>Hello world!</p>'], 'hello3.html',
                            { type: 'text/html' });
        model.upload(file).catch(done);
      });

    });

    describe('#shutdown()', () => {

      it('should shut down a session by session id', (done) => {
        let length = 0;
        manager.sessions.listRunning().then(running => {
          length = running.length;
          return model.newUntitled({ type: 'notebook' });
        }).then(contents => {
          return manager.sessions.startNew({ path: contents.path });
        }).then(session => {
          session.dispose();
          return model.shutdown(session.id);
        }).then(() => {
          return manager.sessions.listRunning();
        }).then(running => {
          expect(running.length).to.be(length);
          done();
        }).catch(done);
      });

    });

  });

});
