// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';

describe('@jupyterlab/notebook', () => {
  describe('NotebookModelFactory', () => {
    describe('#constructor', () => {
      it('should create a new notebook model factory', () => {
        const factory = new NotebookModelFactory({});
        expect(factory).toBeInstanceOf(NotebookModelFactory);
      });
    });

    describe('#name', () => {
      it('should get the name of the model factory', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.name).toBe('notebook');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.contentType).toBe('notebook');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.fileFormat).toBe('json');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory is disposed', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the model factory', () => {
        const factory = new NotebookModelFactory({});
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = new NotebookModelFactory({});
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new model for a given path', () => {
        const factory = new NotebookModelFactory({});
        const model = factory.createNew();
        expect(model).toBeInstanceOf(NotebookModel);
      });

      it('should accept a language preference', () => {
        const factory = new NotebookModelFactory({});
        const model = factory.createNew({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#preferredLanguage()', () => {
      it('should always return an empty string', () => {
        const factory = new NotebookModelFactory({});
        expect(factory.preferredLanguage('')).toBe('');
        expect(factory.preferredLanguage('.ipynb')).toBe('');
      });
    });
  });
});
