// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  IContentsModel, IContentsManager, IContentsOpts, ICheckpointModel,
  IAjaxSettings, ContentsManager
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  CodeMirrorWidget
} from '../../../lib/codemirror/widget';

import {
  AbstractFileHandler
} from '../../../lib/filehandler/handler';

import {
  FileHandler
} from '../../../lib/filehandler/default';

import {
  FileCreator
} from '../../../lib/filehandler/creator';

import {
  FileHandlerRegistry
} from '../../../lib/filehandler/registry';

import {
  MockContentsManager
} from '../mock';

import {
  acceptDialog, dismissDialog
} from '../utils';


class MyRegistry extends FileHandlerRegistry {

  methods: string[] = [];
  handlers: AbstractFileHandler<Widget>[] = [];

  protected findHandler(path: string): AbstractFileHandler<Widget> {
    this.methods.push('findHandler');
    let value = super.findHandler(path);
    this.handlers.push(value);
    return value;
  }
}


class MyHandler extends FileHandler {

  methods: string[] = [];
  handlers: AbstractFileHandler<Widget>[] = [];

  get fileExtensions(): string[] {
    return ['.txt'];
  }

  open(path: string): CodeMirrorWidget {
    this.methods.push('open');
    return super.open(path);
  }

}


describe('jupyter-ui', () => {

  describe('FileHandlerRegistry', () => {

    describe('#opened()', () => {

      it('should be emitted when a file is opened', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        let called = false;
        registry.opened.connect((reg, widget) => {
          expect(widget instanceof Widget).to.be(true);
          called = true;
        });
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        expect(called).to.be(true);
      });

    });

    describe('#finished()', () => {

      it('should be emitted when a file is finished opening', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        registry.finished.connect((reg, widget) => {
          expect(widget instanceof Widget).to.be(true);
          done();
        });
        manager.createFile('foo.txt');
        registry.open('foo.txt');
      });

    });

    describe('#created()', () => {

      it('should be emitted when a file is created', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.created.connect((reg, model) => {
          expect(model.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
        registry.createNew('file', '/');
        acceptDialog();
      });

    });

    describe('#addHandler()', () => {

      it('should add a handler to the registry', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(value).to.be(void 0);
      });

      it('should handle files that match its extension', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(value instanceof Widget).to.be(true);
      });

    });

    describe('#addDefaultHandler()', () => {

      it('should add a default handler to the registry', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(value instanceof Widget).to.be(true);
      });

      it('should be overruled by a handler with a matching extension', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        let main = new FileHandler(manager);
        registry.addDefaultHandler(main);
        registry.addHandler(handler);
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(handler.methods.indexOf('open')).to.not.be(-1);
      });

    });

    describe('#addCreator()', () => {

      it('should add a creator for a specific type', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.created.connect((reg, model) => {
          expect(model.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
        registry.createNew('file', '/');
        acceptDialog();
      });

      it('should reject the promise if the type is not registered', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.createNew('directory', '/').catch(error => {
          done();
        });
      });

    });

    describe('#listCreator()', () => {

      it('should get the list of creator names', () => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.addCreator('foo', creator.createNew.bind(creator));
        expect(registry.listCreators()).to.eql(['file', 'foo']);
      });

    });

    describe('#createNew()', () => {

      it('should create a new file', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.created.connect((reg, model) => {
          expect(model.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
        registry.createNew('file', '/');
        acceptDialog();
      });

      it('should accept a host for the dialog', (done) => {
        let node = document.createElement('div');
        document.body.appendChild(node);
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        let registry = new MyRegistry();
        registry.addCreator('file', creator.createNew.bind(creator));
        registry.created.connect((reg, model) => {
          expect(model.content).to.be(manager.DEFAULT_TEXT);
          document.body.removeChild(node);
          done();
        });
        registry.createNew('file', '/', node);
        acceptDialog(node);
      });

    });

    describe('#open()', () => {

      it('should open a file by path', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        let called = false;
        registry.opened.connect(() => {
          called = true;
        });
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(value instanceof Widget).to.be(true);
        registry.finished.connect((r, w) => {
          expect(called).to.be(true);
          expect(w).to.be(value);
          done();
        });
      });

      it('should bail if there is no handler', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        manager.createFile('foo.txt');
        let value = registry.open('foo.txt');
        expect(value).to.be(void 0);
      });

    });

    describe('#rename()', () => {

      it('should rename the appropriate widget', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        let widget = registry.open('foo.txt');
        let response = registry.rename('foo.txt', 'bar.txt');
        expect(widget.title.text).to.be('bar.txt');
        expect(response).to.be(true);
      });

      it('should bail if the path is not opened', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        let response = registry.rename('foo.txt');
        expect(response).to.be(false);
      });

    });

    describe('#save()', () => {

      it('should save the appropriate widget', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        registry.save('foo.txt').then(contents => {
          expect(contents.name).to.be('foo.txt')
          done();
        });
      });

      it('should reject if the path is not opened', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.save('foo.txt').catch(error => {
          done();
        });
      });

    });

    describe('#revert()', () => {

      it('should revert the appropriate widget', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        registry.revert('foo.txt').then(contents => {
          expect(contents.name).to.be('foo.txt');
          expect(contents.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
      });

      it('should reject if the path is not opened', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.revert('foo.txt').catch(error => {
          done();
        });
      });

    });

    describe('#close()', () => {

      it('should close the appropriate widget', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        registry.close('foo.txt').then(value => {
          expect(value).to.be(true);
          done();
        });
      });

      it('should reject if the path is not opened', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.close('foo.txt').catch(error => {
          done();
        });
      });

    });

    describe('#closeAll', () => {

      it('should close all open widgets across openers', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        let main = new FileHandler(manager);
        registry.addDefaultHandler(main);
        registry.addHandler(handler);
        manager.createFile('foo.txt');
        manager.createFile('foo.md');
        let widget0 = registry.open('foo.txt');
        let widget1 = registry.open('foo.md');
        registry.closeAll().then(() => {
          expect(registry.findPath(widget0)).to.be(void 0);
          expect(registry.findPath(widget1)).to.be(void 0);
          done();
        });
      });

    });

    describe('#findPath()', () => {

      it('should get the path for a given widget', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        let widget = registry.open('foo.txt');
        expect(registry.findPath(widget)).to.be('foo.txt');
      });

      it('should return `undefined` if not found', () => {
        let registry = new MyRegistry();
        let widget = new Widget();
        expect(registry.findPath(widget)).to.be(void 0);
      });

    });

    describe('#findWidget()', () => {

      it('should get the widget for a given path', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        let widget = registry.open('foo.txt');
        expect(registry.findWidget('foo.txt')).to.be(widget);
      });

      it('should return `undefined` if not found', () => {
        let registry = new MyRegistry();
        expect(registry.findWidget('foo.txt')).to.be(void 0);
      });

    });

    describe('#findHandler()', () => {

      it('should use a lone registered handler', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        expect(registry.methods.indexOf('findHandler')).to.not.be(-1);
        expect(registry.handlers.indexOf(handler)).to.not.be(-1);
      });

      it('should use the default handler if there is more than one', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let main = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        registry.addDefaultHandler(main);
        manager.createFile('foo.md');
        registry.open('foo.md');
        expect(registry.methods.indexOf('findHandler')).to.not.be(-1);
        expect(registry.handlers.indexOf(main)).to.not.be(-1);
      });

      it('should use the more specifc handler by filename', () => {
        let manager = new MockContentsManager();
        let handler = new MyHandler(manager);
        let main = new FileHandler(manager);
        let registry = new MyRegistry();
        registry.addHandler(handler);
        registry.addDefaultHandler(handler);
        manager.createFile('foo.txt');
        registry.open('foo.txt');
        expect(registry.methods.indexOf('findHandler')).to.not.be(-1);
        expect(registry.handlers.indexOf(handler)).to.not.be(-1);
      });

    });

  });

});
