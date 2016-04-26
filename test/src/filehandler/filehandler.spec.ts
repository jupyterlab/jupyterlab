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
  AbstractFileHandler
} from '../../../lib/filehandler/handler';



class MockContentsManager implements IContentsManager {

  get(path: string, options?: IContentsOpts): Promise<IContentsModel> {
    return Promise.resolve({
      name: path.split('/').pop(),
      path: path,
      type: 'file',
      content: 'bar'
    });
  }

  newUntitled(path: string, options: IContentsOpts): Promise<IContentsModel> {
    return Promise.resolve({
      name: 'untitled',
      path: `${path}/untitled`,
      type: 'file',
      content: 'bar'
    });
  }

  delete(path: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  rename(path: string, newPath: string): Promise<IContentsModel> {
    return Promise.resolve({
      name: newPath.split('/').pop(),
      path: newPath,
      type: 'file',
      content: 'bar'
    });
  }

  save(path: string, model: IContentsModel): Promise<IContentsModel> {
    return Promise.resolve(model);
  }

  copy(path: string, toDir: string): Promise<IContentsModel> {
    let name = path.split('/').pop();
    return Promise.resolve({
      name,
      path: `${toDir}/${name}`,
      type: 'file',
      content: 'bar'
    });
  }

  listContents(path: string): Promise<IContentsModel> {
    return Promise.resolve({
      name: path.split('/').pop(),
      path,
      type: 'dirty',
      content: []
    });
  }

  createCheckpoint(path: string): Promise<ICheckpointModel> {
    return Promise.resolve(void 0);
  }

  listCheckpoints(path: string): Promise<ICheckpointModel[]> {
    return Promise.resolve(void 0);
  }

  restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  ajaxSettings: IAjaxSettings = {};
}


class FileHandler extends AbstractFileHandler<Widget> {

  methods: string[] = [];

  protected getSaveOptions(widget: Widget, path: string): Promise<IContentsOpts> {
    this.methods.push('getSaveOptions');
    return Promise.resolve({ path, content: 'baz', name,
                             type: 'file', format: 'text' });
  }

  protected createWidget(path: string): Widget {
    this.methods.push('createWidget');
    return new Widget();
  }

  protected populateWidget(widget: Widget, model: IContentsModel): Promise<IContentsModel> {
    this.methods.push('populateWidget');
    return Promise.resolve(model);
  }

  protected getFetchOptions(path: string): IContentsOpts {
    this.methods.push('getFetchOptions');
    return super.getFetchOptions(path);
  }

  protected getTitleText(path: string): string {
    this.methods.push('getTitleText');
    return super.getTitleText(path);
  }

  protected beforeClose(widget: Widget): Promise<void> {
    this.methods.push('beforeClose');
    return super.beforeClose(widget);
  }
}


describe('jupyter-ui', () => {

  describe('AbstractFileHandler', () => {

    describe('#constructor()', () => {

      it('should accept a contents manager', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(handler instanceof AbstractFileHandler).to.be(true);
      });

    });

    describe('#opened', () => {

      it('should be emitted when an item is opened', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let called = false;
        handler.opened.connect((h, widget) => {
          expect(widget instanceof Widget).to.be(true);
          called = true;
        });
        handler.open('foo.txt');
        expect(called).to.be(true);
      });

    });

    describe('#finished', () => {

      it('should be emitted when a widget is populated', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        handler.finished.connect((h, widget) => {
          expect(widget instanceof Widget).to.be(true);
          done();
        });
        handler.open('foo.txt');
      });

    });

    describe('#fileExtensions', () => {

      it('should be an empty list by default', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(handler.fileExtensions).to.eql([]);
      });

      it('should be read only', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(() => { handler.fileExtensions = []; }).to.throwError();
      });

    });

    describe('#manager', () => {

      it('should be the contents manager used by the handler', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(handler.manager).to.be(manager);
      });

      it('should be read only', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(() => { handler.manager = null; }).to.throwError();
      });

    });

    describe('#findWidget()', () => {

      it('should find a widget given a path', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.findWidget('foo.txt')).to.be(widget);
      });

      it('should return `undefined` if the path is invalid', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.findWidget('bar.txt')).to.be(void 0);
      });

    });

    describe('#findPath()', () => {

      it('should find a path given a widget', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.findPath(widget)).to.be('foo.txt');
      });

      it('should return `undefined` if the widget is invalid', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.close('foo.txt').then(() => {
          expect(handler.findPath(widget)).to.be(void 0);
          done();
        });
      });

    });

    describe('#open()', () => {

      it('should open a file by path and return a widget', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(widget instanceof Widget).to.be(true);
      });

      it('should return an existing widget if it is already open', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.open('foo.txt')).to.be(widget);
      });

      it('should clear the dirty state when finished', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.finished.connect(() => {
          expect(handler.isDirty('foo.txt')).to.be(false);
          done();
        });
      });

      it('should set the title', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(widget.title.text).to.be('foo.txt');
      });

    });

    describe('#rename()', () => {

      it('should rename the file', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.rename('foo.txt', 'bar.txt');
        expect(handler.findWidget('bar.txt')).to.be(widget);
      });

      it('should update the title', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.rename('foo.txt', 'bar.txt');
        expect(widget.title.text).to.be('bar.txt');
      });

    });

    describe('#save()', () => {

      it('should resolve to the file contents', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.save('foo.txt').then(contents => {
          expect(contents.content).to.be('baz');
          done();
        });
      });

      it('should clear the dirty flag', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.setDirty('foo.txt');
        handler.save('foo.txt').then(contents => {
          expect(handler.isDirty('foo.txt')).to.be(false);
          done();
        });
      });

    });

    describe('#revert()', () => {

      it('should resolve to the original file contents', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.revert('foo.txt').then(contents => {
          expect(contents.content).to.be('bar');
          done();
        });
      });

      it('should clear the dirty flag', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        handler.setDirty('foo.txt');
        handler.revert('foo.txt').then(contents => {
          expect(handler.isDirty('foo.txt')).to.be(false);
          done();
        });
      });

    });

    describe('#close()', () => {

      it('should close a file by path', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        widget.attach(document.body);
        handler.close('foo.txt').then(result => {
          expect(result).to.be(true);
          expect(widget.isAttached).to.be(false);
          done();
        });
      });

      it('should return false if the path is invalid', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        handler.close('foo.txt').then(result => {
          expect(result).to.be(false);
          done();
        });
      });

      it('should prompt the user if the file is dirty', () => {
        // TODO
      });

      it('should call beforeClose', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        widget.attach(document.body);
        handler.close('foo.txt').then(result => {
          expect(result).to.be(true);
          expect(handler.methods.indexOf('beforeClose')).to.not.be(-1);
          done();
        });
      });

    });

  });

});
