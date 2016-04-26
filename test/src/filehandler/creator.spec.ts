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


class MyFileCreator extends FileCreator {

  methods: string[] = [];

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

    describe('#createUntitled()', () => {

      it('should create a new untitled file on the given path', (done) => {
        let manager = new MockContentsManager();
        let creator = new MyFileCreator(manager);
        creator.createUntitled('foo/').then(contents => {
          console.log('***', contents.type, contents.name);
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
