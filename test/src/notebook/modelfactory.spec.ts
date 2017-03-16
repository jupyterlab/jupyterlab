// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeCellModel
} from '@jupyterlab/cells';

import {
  NotebookModel
} from '@jupyterlab/notebook';

import {
  NotebookModelFactory
} from '@jupyterlab/notebook';


describe('notebook/notebook/modelfactory', () => {

  describe('NotebookModelFactory', () => {

    describe('#constructor', () => {

      it('should create a new notebook model factory', () => {
        let factory = new NotebookModelFactory({});
        expect(factory).to.be.a(NotebookModelFactory);
      });

      it('should accept a code cell content factory', () => {
        let codeCellContentFactory = new CodeCellModel.ContentFactory();
        let factory = new NotebookModelFactory({ codeCellContentFactory });
        expect(factory.contentFactory.codeCellContentFactory).to.be(codeCellContentFactory);
      });

      it('should accept a notebook model content factory', () => {
        let contentFactory = new NotebookModel.ContentFactory({});
        let factory = new NotebookModelFactory({ contentFactory });
        expect(factory.contentFactory).to.be(contentFactory);
      });

    });

    describe('#contentFactory', () => {

      it('should be the content factory used by the model factory', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.contentFactory).to.be.a(NotebookModel.ContentFactory);
      });

    });

    describe('#name', () => {

      it('should get the name of the model factory', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.name).to.be('notebook');
      });

    });

    describe('#contentType', () => {

      it('should get the file type', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.contentType).to.be('notebook');
      });

    });

    describe('#fileFormat', () => {

      it('should get the file format', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.fileFormat).to.be('json');
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory is disposed', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the model factory', () => {
        let factory = new NotebookModelFactory({});
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = new NotebookModelFactory({});
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new model for a given path', () => {
        let factory = new NotebookModelFactory({});
        let model = factory.createNew();
        expect(model).to.be.a(NotebookModel);
      });

      it('should add an empty code cell by default', () => {
        let factory = new NotebookModelFactory({});
        let model = factory.createNew();
        expect(model.cells.length).to.be(1);
        expect(model.cells.at(0).type).to.be('code');
      });

      it('should accept a language preference', () => {
        let factory = new NotebookModelFactory({});
        let model = factory.createNew('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#preferredLanguage()', () => {

      it('should always return an empty string', () => {
        let factory = new NotebookModelFactory({});
        expect(factory.preferredLanguage('')).to.be('');
        expect(factory.preferredLanguage('.ipynb')).to.be('');
      });

    });

  });

});
