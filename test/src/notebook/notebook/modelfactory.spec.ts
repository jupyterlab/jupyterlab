// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  NotebookModelFactory
} from '../../../../lib/notebook/notebook/modelfactory';


describe('notebook/notebook/modelfactory', () => {

  describe('NotebookModel', () => {

    describe('#name', () => {

      it('should get the name of the model factory', () => {
        let factory = new NotebookModelFactory();
        expect(factory.name).to.be('notebook');
      });

      it('should be read-only', () => {
        let factory = new NotebookModelFactory();
        expect(() => { (factory as any).name = ''; }).to.throwError();
      });

    });

    describe('#type', () => {

      it('should get the file type', () => {
        let factory = new NotebookModelFactory();
        expect(factory.fileType).to.be('notebook');
      });

      it('should be read-only', () => {
        let factory = new NotebookModelFactory();
        expect(() => { (factory as any).fileType = 'notebook'; }).to.throwError();
      });

    });

    describe('#format', () => {

      it('should get the file format', () => {
        let factory = new NotebookModelFactory();
        expect(factory.fileFormat).to.be('json');
      });

      it('should be read-only', () => {
        let factory = new NotebookModelFactory();
        expect(() => { (factory as any).fileFormat = 'json'; }).to.throwError();
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory is disposed', () => {
        let factory = new NotebookModelFactory();
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let factory = new NotebookModelFactory();
        expect(() => { (factory as any).isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the model factory', () => {
        let factory = new NotebookModelFactory();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = new NotebookModelFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new model for a given path', () => {
        let factory = new NotebookModelFactory();
        let model = factory.createNew();
        expect(model).to.be.a(NotebookModel);
      });

      it('should add an empty code cell by default', () => {
        let factory = new NotebookModelFactory();
        let model = factory.createNew();
        expect(model.cells.length).to.be(1);
        expect(model.cells.get(0).type).to.be('code');
      });

      it('should accept a language preference', () => {
        let factory = new NotebookModelFactory();
        let model = factory.createNew('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#preferredLanguage()', () => {

      it('should always return an empty string', () => {
        let factory = new NotebookModelFactory();
        expect(factory.preferredLanguage('')).to.be('');
        expect(factory.preferredLanguage('.ipynb')).to.be('');
      });

    });

  });

});
