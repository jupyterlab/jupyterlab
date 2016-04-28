// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  IContentsModel, IContentsManager, IContentsOpts, ICheckpointModel,
  IAjaxSettings, ContentsManager
} from 'jupyter-js-services';

import {
  MockContentsManager
} from 'jupyter-js-services/lib/mockcontents';

import {
  CodeMirrorWidget
} from '../../../lib/codemirror/widget';

import {
  FileHandler
} from '../../../lib/filehandler/default';


class MyFileHandler extends FileHandler {

  methods: string[] = [];

  protected getSaveOptions(widget: CodeMirrorWidget, path: string): Promise<IContentsOpts> {
    this.methods.push('getSaveOptions');
    return super.getSaveOptions(widget, path);
  }

  protected createWidget(path: string): CodeMirrorWidget {
    this.methods.push('createWidget');
    return super.createWidget(path);
  }

  protected populateWidget(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsModel> {
    this.methods.push('populateWidget');
    return super.populateWidget(widget, model);
  }
}


describe('jupyter-ui', () => {

  describe('FileHandler', () => {

    describe('#constructor()', () => {

      it('should accept a contents manager', () => {
        let manager = new MockContentsManager();
        let handler = new FileHandler(manager);
        expect(handler instanceof FileHandler).to.be(true);
      });

    });

    describe('#createWidget()', () => {

      it('should return a CodeMirrorWidget', () => {
        let manager = new MockContentsManager();
        let handler = new MyFileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.methods.indexOf('createWidget')).to.not.be(-1);
        expect(widget instanceof CodeMirrorWidget).to.be(true);
      });


      it('should set the dirty flag when the editor text changes', () => {
        let manager = new MockContentsManager();
        let handler = new MyFileHandler(manager);
        let widget = handler.open('foo.txt');
        expect(handler.methods.indexOf('createWidget')).to.not.be(-1);
        let editor = widget.editor;
        editor.getDoc().setValue('test');
        expect(handler.isDirty('foo.txt')).to.be(true);
      });

    });

    describe('#populateWidget()', () => {

      it('should load text and the appropriate codemirror mode', (done) => {
        let manager = new MockContentsManager();
        let handler = new MyFileHandler(manager);
        manager.createFile('foo.ts');
        let widget = handler.open('foo.ts');
        handler.finished.connect(() => {
          expect(handler.methods.indexOf('populateWidget')).to.not.be(-1);
          let doc = widget.editor.getDoc();
          expect(doc.getValue()).to.be(manager.DEFAULT_TEXT);
          let mode = doc.getMode();
          expect(mode.name).to.be('javascript');
          done();
        });

      });

    });

    describe('#getSaveOptions()', () => {

      it('should save as a text file', () => {
        let manager = new MockContentsManager();
        let handler = new MyFileHandler(manager);
        manager.createFile('foo.ts');
        let widget = handler.open('foo.ts');
        widget.editor.getDoc().setValue('test test');
        handler.save('foo.ts').then(contents => {
          expect(handler.methods.indexOf('getSaveOptions')).to.not.be(-1);
          expect(contents.path).to.be('foo.ts');
          expect(contents.content).to.be('test test');
          expect(contents.name).to.be('foo.ts');
          expect(contents.type).to.be('file');
          expect(contents.format).to.be('text');
        });
      });

    });

  });

});
