// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  IContentsModel, IContentsManager, ContentsManager
} from 'jupyter-js-services';

import {
  FileCreator, DirectoryCreator
} from '../../../lib/filehandler/creator';

import {
  MockContentsManager
} from '../mock';

import {
  acceptDialog, dismissDialog, waitForDialog
} from '../utils';


class MyFileCreator extends FileCreator {

  methods: string[] = [];

  getFileNode(): HTMLInputElement {
    return this.fileNode;
  }

  doRename(contents: IContentsModel): Promise<IContentsModel> {
    this.methods.push('doRename');
    return super.doRename(contents);
  }

  showErrorMessage(error: Error): Promise<IContentsModel> {
    this.methods.push('showErrorMessage');
    return super.showErrorMessage(error);
  }

  handleExisting(name: string, contents: IContentsModel): Promise<IContentsModel> {
    this.methods.push('handleExisting');
    return super.handleExisting(name, contents);
  }

  createUntitled(path: string): Promise<IContentsModel> {
    this.methods.push('createUntitled');
    return super.createUntitled(name);
  }
}


class MyDirectoryCreator extends DirectoryCreator {

  methods: string[] = [];

  createUntitled(path: string): Promise<IContentsModel> {
    this.methods.push('createUntitled');
    return super.createUntitled(name);
  }
}


describe('jupyter-ui', () => {

  describe('FileCreator', () => {

    describe('#constructor()', () => {

      it('should accept a contents manager and a display name', () => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager, 'File');
        expect(creator instanceof FileCreator).to.be(true);
      });

      it('should provide a default display name', () => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        expect(creator instanceof FileCreator).to.be(true);
      });

    });

    describe('#createNew', () => {

      it('should do nothing if the dialog is dismissed', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        creator.createNew('foo').then(contents => {
          expect(contents).to.be(void 0);
          done();
        });
        dismissDialog();
      });

      it('should create the untitled file if dialog is accepted', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        creator.createNew('foo').then(contents => {
          expect(contents.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
        acceptDialog();
      });

      it('should create the untitled file if dialog is accepted', (done) => {
        let manager = new MockContentsManager();
        let creator = new FileCreator(manager);
        creator.createNew('foo').then(contents => {
          expect(contents.content).to.be(manager.DEFAULT_TEXT);
          done();
        });
        acceptDialog();
      });

      it('should support an accepted rename', (done) => {
        let manager = new MockContentsManager();
        let creator = new MyFileCreator(manager);
        creator.createNew('foo').then(contents => {
          expect(contents.name).to.be('bar.txt');
          done();
        });
        waitForDialog().then(() => {
          let node = creator.getFileNode();
          node.value = 'bar.txt';
          acceptDialog();
        });
      });

    });

    describe('#createUntitled()', () => {

      it('should create a new untitled file on the given path', (done) => {
        let manager = new MockContentsManager();
        let creator = new MyFileCreator(manager);
        creator.createUntitled('foo/').then(contents => {
          expect(contents.type).to.be('file');
          expect(contents.name.indexOf('.txt')).to.not.be(-1);
          done();
        });
      });

    });

  });

  describe('DirectoryCreator', () => {

    describe('#constructor', () => {

      it('should accept a contents manager and a display name', () => {
        let manager = new MockContentsManager();
        let creator = new DirectoryCreator(manager, 'Directory');
        expect(creator instanceof DirectoryCreator).to.be(true);
      });

      it('should provide a default display name', () => {
        let manager = new MockContentsManager();
        let creator = new DirectoryCreator(manager);
        expect(creator instanceof DirectoryCreator).to.be(true);
      });

    });

    describe('#createUntitled()', () => {

      it('should create a new untitled directory on the given path', (done) => {
        let manager = new MockContentsManager();
        let creator = new MyDirectoryCreator(manager);
        creator.createUntitled('foo/').then(contents => {
          expect(contents.type).to.be('directory');
          done();
        });
      });

    });

  });

});
