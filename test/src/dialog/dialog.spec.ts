// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  IContentsModel, IContentsManager, IContentsOpts, ICheckpointModel,
  IAjaxSettings, ContentsManager
} from 'jupyter-js-services';

import {
  sendMessage
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  AbstractFileHandler
} from '../../../lib/filehandler/handler';

import {
  MockContentsManager
} from '../mock';


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
        handler.setDirty('foo.txt', true);
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
        handler.setDirty('foo.txt', true);
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

    });

    describe('#closeAll()', () => {

      it('should class all files', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        let widget1 = handler.open('bar.txt');
        widget0.attach(document.body);
        handler.closeAll().then(() => {
          expect(widget0.isAttached).to.be(false);
          expect(handler.findWidget('bar.txt')).to.be(void 0);
          done();
        });
      });

    });

    describe('#isDirty()', () => {

      it('should default to false', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        expect(handler.isDirty('foo.txt')).to.be(false);
      });

      it('should return `undefined` if the path is invalid', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        expect(handler.isDirty('bar.txt')).to.be(void 0);
      });

    });

    describe('#setDirty()', () => {

      it('should set the dirty state of a file', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.setDirty('foo.txt', true);
        expect(handler.isDirty('foo.txt')).to.be(true);
        handler.setDirty('foo.txt', false);
        expect(handler.isDirty('foo.txt')).to.be(false);
      });

      it('should affect the className of the title', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(widget.title.className.indexOf('jp-mod-dirty')).to.be(-1);
        handler.setDirty('foo.txt', true);
        expect(widget.title.className.indexOf('jp-mod-dirty')).to.not.be(-1);
      });

      it('should be a no-op for an invalid path', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.setDirty('bar.txt', true);
      });

    });

    describe('#filterMessage()', () => {

      it('should filter close messages for contained widgets', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget = handler.open('foo.txt');
        let value = handler.filterMessage(widget, Widget.MsgCloseRequest);
        expect(value).to.be(true);
        value = handler.filterMessage(widget, Widget.MsgUpdateRequest);
        expect(value).to.be(false);
      });

    });

    describe('#getFetchOptions()', () => {

      it('should get the options use to fetch contents from disk', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        expect(handler.methods.indexOf('getFetchOptions')).to.not.be(-1);
      });

      it('should be called during a revert', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.methods = [];
        handler.revert('foo.txt');
        expect(handler.methods.indexOf('getFetchOptions')).to.not.be(-1);
      });

    });

    describe('#getSaveOptions()', () => {

      it('should get the options used to save the widget', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.save('foo.txt');
        expect(handler.methods.indexOf('getSaveOptions')).to.not.be(-1);
      });

    });

    describe('#createWidget()', () => {

      it('should be used to create the initial widget given a path', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        expect(handler.methods.indexOf('createWidget')).to.not.be(-1);
      });

    });

    describe('#populateWidget()', () => {

      it('should be called to populate a widget while opening', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.finished.connect(() => {
          expect(handler.methods.indexOf('populateWidget')).to.not.be(-1);
          done();
        });
      });

      it('should be called when reverting', (done) => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        let called = false;
        handler.finished.connect(() => {
          handler.methods = [];
          handler.revert('foo.txt').then(() => {
            expect(handler.methods.indexOf('populateWidget')).to.not.be(-1);
            done();
          });
        });
      });

    });

    describe('#getTitleText()', () => {

      it('should set the appropriate title text based on a path', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        expect(handler.methods.indexOf('getTitleText')).to.not.be(-1);
      });

      it('should be called when renaming', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        let widget0 = handler.open('foo.txt');
        handler.methods = [];
        handler.rename('foo.txt', 'bar.txt');
        expect(handler.methods.indexOf('getTitleText')).to.not.be(-1);
      });
    });

    describe('#beforeClose()', () => {

      it('should call before closing', (done) => {
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
