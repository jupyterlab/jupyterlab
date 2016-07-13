// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockServiceManager
} from 'jupyter-js-services/lib/mockmanager';

import {
  FileBrowserModel
} from '../../../lib/filebrowser';


describe('filebrowser/model', () => {

  describe('FileBrowserModel', () => {

    describe('#constructor()', () => {

      it('should construct a new file browser model', () => {
        let manager = new MockServiceManager();
        let model = new FileBrowserModel({ manager });
        expect(model).to.be.a(FileBrowserModel);
      });

    });

    describe('#pathChanged', () => {

      it('should be emitted when the path changes', () => {

      });

    });

    describe('#refreshed', () => {

    });

    describe('#fileChanged', () => {

    });

    describe('#path', () => {

    });

    describe('#items', () => {

    });

    describe('#isDisposed', () => {

    });

    describe('#sessions', () => {

    });

    describe('#kernelspecs', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#cd()', () => {

    });

    describe('#refresh()', () => {

    });

    describe('#deleteFile()', () => {

    });

    describe('#download()', () => {

    });

    describe('#newUntitled()', () => {

    });

    describe('#rename()', () => {

    });

    describe('#upload()', () => {

    });

    describe('#shutdown()', () => {

    });

  });

});
