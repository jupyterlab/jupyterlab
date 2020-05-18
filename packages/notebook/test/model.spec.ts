// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { ArrayExt, toArray } from '@lumino/algorithm';

import { CodeCellModel } from '@jupyterlab/cells';

import * as nbformat from '@jupyterlab/nbformat';

import { NotebookModel } from '../src';

import { ModelDB } from '@jupyterlab/observables';

import { acceptDialog } from '@jupyterlab/testutils';

import * as utils from './utils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookModel', () => {
    describe('#constructor()', () => {
      it('should create a notebook model', () => {
        const model = new NotebookModel();
        expect(model).toBeInstanceOf(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        const model = new NotebookModel({ languagePreference: 'python' });
        const lang = model.metadata.get(
          'language_info'
        ) as nbformat.ILanguageInfoMetadata;
        expect(lang.name).toBe('python');
      });

      it('should accept an optional factory', () => {
        const contentFactory = new NotebookModel.ContentFactory({});
        const model = new NotebookModel({ contentFactory });
        expect(model.contentFactory.codeCellContentFactory).toBe(
          contentFactory.codeCellContentFactory
        );
      });
    });

    describe('#metadataChanged', () => {
      it('should be emitted when a metadata field changes', () => {
        const model = new NotebookModel();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).toBe(model.metadata);
          expect(args.key).toBe('foo');
          expect(args.oldValue).toBeUndefined();
          expect(args.newValue).toBe(1);
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).toBe(true);
      });

      it('should not be emitted when the value does not change', () => {
        const model = new NotebookModel();
        let called = false;
        model.metadata.set('foo', 1);
        model.metadata.changed.connect(() => {
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).toBe(false);
      });
    });

    describe('#cells', () => {
      it('should be reset when loading from disk', () => {
        const model = new NotebookModel();
        const cell = model.contentFactory.createCodeCell({});
        model.cells.push(cell);
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(ArrayExt.firstIndexOf(toArray(model.cells), cell)).toBe(-1);
        expect(model.cells.length).toBe(6);
      });

      it('should allow undoing a change', () => {
        const model = new NotebookModel();
        const cell = model.contentFactory.createCodeCell({});
        cell.value.text = 'foo';
        model.cells.push(cell);
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.cells.undo();
        expect(model.cells.length).toBe(1);
        expect(model.cells.get(0).value.text).toBe('foo');
        expect(model.cells.get(0)).toBe(cell); // should be ===.
      });

      describe('cells `changed` signal', () => {
        it('should emit a `contentChanged` signal upon cell addition', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.cells.push(cell);
          expect(called).toBe(true);
        });

        it('should emit a `contentChanged` signal upon cell removal', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          model.cells.push(cell);
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.cells.remove(0);
          expect(called).toBe(true);
        });

        it('should emit a `contentChanged` signal upon cell move', () => {
          const model = new NotebookModel();
          const cell0 = model.contentFactory.createCodeCell({});
          const cell1 = model.contentFactory.createCodeCell({});
          model.cells.push(cell0);
          model.cells.push(cell1);
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.cells.move(0, 1);
          expect(called).toBe(true);
        });

        it('should set the dirty flag', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          model.cells.push(cell);
          expect(model.dirty).toBe(true);
        });
      });

      describe('cell `changed` signal', () => {
        it('should be called when a cell content changes', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          model.cells.push(cell);
          cell.value.text = 'foo';
        });

        it('should emit the `contentChanged` signal', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          model.cells.push(cell);
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.metadata.set('foo', 'bar');
          expect(called).toBe(true);
        });

        it('should set the dirty flag', () => {
          const model = new NotebookModel();
          const cell = model.contentFactory.createCodeCell({});
          model.cells.push(cell);
          model.dirty = false;
          cell.value.text = 'foo';
          expect(model.dirty).toBe(true);
        });
      });
    });

    describe('#contentFactory', () => {
      it('should be the cell model factory used by the model', () => {
        const model = new NotebookModel();
        expect(model.contentFactory.codeCellContentFactory).toBe(
          NotebookModel.defaultContentFactory.codeCellContentFactory
        );
      });
    });

    describe('#nbformat', () => {
      it('should get the major version number of the nbformat', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.nbformat).toBe(utils.DEFAULT_CONTENT.nbformat);
      });

      it('should present a dialog when the format changes', () => {
        const model = new NotebookModel();
        const content = {
          ...utils.DEFAULT_CONTENT,
          metadata: {
            ...utils.DEFAULT_CONTENT.metadata,
            orig_nbformat: 1
          }
        };
        model.fromJSON(content);
        expect(model.nbformat).toBe(nbformat.MAJOR_VERSION);
        return acceptDialog();
      });
    });

    describe('#nbformatMinor', () => {
      it('should get the minor version number of the nbformat', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.nbformatMinor).toBe(nbformat.MINOR_VERSION);
      });
    });

    describe('#defaultKernelName()', () => {
      it('should get the default kernel name of the document', () => {
        const model = new NotebookModel();
        model.metadata.set('kernelspec', { name: 'python3' });
        expect(model.defaultKernelName).toBe('python3');
      });

      it('should default to an empty string', () => {
        const model = new NotebookModel();
        expect(model.defaultKernelName).toBe('');
      });
    });

    describe('#defaultKernelLanguage', () => {
      it('should get the default kernel language of the document', () => {
        const model = new NotebookModel();
        model.metadata.set('language_info', { name: 'python' });
        expect(model.defaultKernelLanguage).toBe('python');
      });

      it('should default to an empty string', () => {
        const model = new NotebookModel();
        expect(model.defaultKernelLanguage).toBe('');
      });

      it('should be set from the constructor arg', () => {
        const model = new NotebookModel({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.dispose();
        expect(model.cells).toBeNull();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new NotebookModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toString()', () => {
      it('should serialize the model to a string', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        const text = model.toString();
        const data = JSON.parse(text);
        expect(data.cells.length).toBe(6);
      });
    });

    describe('#fromString()', () => {
      it('should deserialize the model from a string', () => {
        const model = new NotebookModel();
        model.fromString(JSON.stringify(utils.DEFAULT_CONTENT));
        expect(model.cells.length).toBe(6);
      });

      it('should set the dirty flag', () => {
        const model = new NotebookModel();
        model.dirty = false;
        model.fromString(JSON.stringify(utils.DEFAULT_CONTENT));
        expect(model.dirty).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        const data = model.toJSON();
        expect(data.cells.length).toBe(6);
      });
    });

    describe('#fromJSON()', () => {
      it('should serialize the model from JSON', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.cells.length).toBe(6);
        expect(model.nbformat).toBe(utils.DEFAULT_CONTENT.nbformat);
        expect(model.nbformatMinor).toBe(nbformat.MINOR_VERSION);
      });

      it('should set the dirty flag', () => {
        const model = new NotebookModel();
        model.dirty = false;
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.dirty).toBe(true);
      });
    });

    describe('#metadata', () => {
      it('should have default values', () => {
        const model = new NotebookModel();
        const metadata = model.metadata;
        expect(metadata.has('kernelspec')).toBeTruthy();
        expect(metadata.has('language_info')).toBeTruthy();
        expect(metadata.size).toBe(2);
      });

      it('should set the dirty flag when changed', () => {
        const model = new NotebookModel();
        expect(model.dirty).toBe(false);
        model.metadata.set('foo', 'bar');
        expect(model.dirty).toBe(true);
      });

      it('should emit the `contentChanged` signal', () => {
        const model = new NotebookModel();
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        model.metadata.set('foo', 'bar');
        expect(called).toBe(true);
      });

      it('should emit the `metadataChanged` signal', () => {
        const model = new NotebookModel();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).toBe(model.metadata);
          expect(args.key).toBe('foo');
          expect(args.oldValue).toBeUndefined();
          expect(args.newValue).toBe('bar');
          called = true;
        });
        model.metadata.set('foo', 'bar');
        expect(called).toBe(true);
      });
    });

    describe('#initialize()', () => {
      it('should add one code cell if the model is empty', () => {
        const model = new NotebookModel();
        expect(model.cells.length).toBe(0);
        model.initialize();
        expect(model.cells.length).toBe(1);
        expect(model.cells.get(0).type).toBe('code');
      });

      it('should clear undo state', () => {
        const model = new NotebookModel();
        const cell = model.contentFactory.createCodeCell({});
        cell.value.text = 'foo';
        model.cells.push(cell);
        expect(model.cells.canUndo).toBe(true);
        model.initialize();
        expect(model.cells.canUndo).toBe(false);
      });
    });

    describe('.ContentFactory', () => {
      let factory = new NotebookModel.ContentFactory({});

      describe('#codeCellContentFactory', () => {
        it('should be a code cell content factory', () => {
          expect(factory.codeCellContentFactory).toBe(
            CodeCellModel.defaultContentFactory
          );
        });

        it('should be settable in the constructor', () => {
          const codeCellContentFactory = new CodeCellModel.ContentFactory();
          factory = new NotebookModel.ContentFactory({
            codeCellContentFactory
          });
          expect(factory.codeCellContentFactory).toBe(codeCellContentFactory);
        });
      });

      describe('#createCell()', () => {
        it('should create a new code cell', () => {
          const cell = factory.createCell('code', {});
          expect(cell.type).toBe('code');
        });

        it('should create a new markdown cell', () => {
          const cell = factory.createCell('markdown', {});
          expect(cell.type).toBe('markdown');
        });

        it('should create a new raw cell', () => {
          const cell = factory.createCell('raw', {});
          expect(cell.type).toBe('raw');
        });
      });

      describe('#createCodeCell()', () => {
        it('should create a new code cell', () => {
          const cell = factory.createCodeCell({});
          expect(cell.type).toBe('code');
        });

        it('should clone an existing code cell', () => {
          const orig = factory.createCodeCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createCodeCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createCodeCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#createRawCell()', () => {
        it('should create a new raw cell', () => {
          const cell = factory.createRawCell({});
          expect(cell.type).toBe('raw');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createRawCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing code cell', () => {
          const orig = factory.createCodeCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createRawCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#createMarkdownCell()', () => {
        it('should create a new markdown cell', () => {
          const cell = factory.createMarkdownCell({});
          expect(cell.type).toBe('markdown');
        });

        it('should clone an existing markdown cell', () => {
          const orig = factory.createMarkdownCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createMarkdownCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell({});
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createMarkdownCell({ cell });
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#modelDB', () => {
        it('should be undefined by default', () => {
          expect(factory.modelDB).toBeUndefined();
        });
      });

      describe('#clone()', () => {
        it('should create a new content factory with a new IModelDB', () => {
          const modelDB = new ModelDB();
          const factory = new NotebookModel.ContentFactory({ modelDB });
          expect(factory.modelDB).toBe(modelDB);
          const newModelDB = new ModelDB();
          const newFactory = factory.clone(newModelDB);
          expect(newFactory.modelDB).toBe(newModelDB);
          expect(newFactory.codeCellContentFactory).toBe(
            factory.codeCellContentFactory
          );
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be a ContentFactory', () => {
        expect(NotebookModel.defaultContentFactory).toBeInstanceOf(
          NotebookModel.ContentFactory
        );
      });
    });
  });
});
