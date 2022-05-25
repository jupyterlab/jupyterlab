// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCellModel } from '@jupyterlab/cells';
import * as nbformat from '@jupyterlab/nbformat';
import { SharedDoc } from '@jupyterlab/shared-models';
import { acceptDialog } from '@jupyterlab/testutils';
import { ArrayExt, toArray } from '@lumino/algorithm';
import { NotebookModel } from '..';
import * as utils from './utils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookModel', () => {
    describe('#constructor()', () => {
      it('should create a notebook model', () => {
        const model = new NotebookModel({});
        model.initialize();
        expect(model).toBeInstanceOf(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        const model = new NotebookModel({ languagePreference: 'python' });
        model.initialize();
        const lang = model.metadata.get(
          'language_info'
        ) as nbformat.ILanguageInfoMetadata;
        expect(lang.name).toBe('python');
      });

      it('should accept an optional factory', () => {
        const contentFactory = new NotebookModel.ContentFactory({
          sharedDoc: new SharedDoc()
        });
        const model = new NotebookModel({ contentFactory });
        model.initialize();
        expect(model.contentFactory.codeCellContentFactory).toBe(
          contentFactory.codeCellContentFactory
        );
      });
    });

    describe('#metadataChanged', () => {
      it('should be emitted when a metadata field changes', () => {
        const model = new NotebookModel();
        model.initialize();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).toBe(model.metadata);
          expect(args[0].key).toBe('foo');
          expect(args[0].oldValue).toBeUndefined();
          expect(args[0].newValue).toBe(1);
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).toBe(true);
      });
    });

    describe('#cells', () => {
      it('should be reset when loading from disk', () => {
        const model = new NotebookModel();
        model.initialize();
        const cell = model.contentFactory.createCodeCell();
        model.cells.push(cell);
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        expect(ArrayExt.firstIndexOf(toArray(model.cells), cell)).toBe(-1);
        expect(model.cells.length).toBe(7);
      });

      it('should allow undoing a change', () => {
        const model = new NotebookModel();
        model.initialize();
        model.cells.clear();
        const cell = model.contentFactory.createCodeCell();
        model.cells.push(cell);
        cell.value.text = 'foo';
        const cellJSON = cell.toJSON();
        model.cells.clearUndo();
        expect(model.cells.length).toBe(1);
        model.cells.remove(model.cells.length - 1);
        model.cells.undo();
        expect(model.cells.length).toBe(1);
        expect(model.cells.get(0).value.text).toBe('foo');
        // Previous model matches the restored model
        expect(model.cells.get(0).toJSON()).toEqual(cellJSON);
      });

      describe('cells `changed` signal', () => {
        it('should emit a `contentChanged` signal upon cell addition', () => {
          const model = new NotebookModel();
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.cells.push(cell);
          expect(called).toBe(true);
        });

        it('should emit a `contentChanged` signal upon cell removal', () => {
          const model = new NotebookModel();
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
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
          model.initialize();
          const cell0 = model.contentFactory.createCodeCell();
          const cell1 = model.contentFactory.createCodeCell();
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
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
          model.cells.push(cell);
          expect(model.dirty).toBe(true);
        });
      });

      describe('cell `changed` signal', () => {
        it('should be called when a cell content changes', () => {
          const model = new NotebookModel();
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
          model.cells.push(cell);
          expect(() => {
            cell.value.text = 'foo';
          }).not.toThrow();
        });

        it('should emit the `contentChanged` signal', () => {
          const model = new NotebookModel();
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
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
          model.initialize();
          const cell = model.contentFactory.createCodeCell();
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
        model.initialize();
        expect(model.contentFactory.codeCellContentFactory).toBe(
          NotebookModel.defaultContentFactory.codeCellContentFactory
        );
      });
    });

    describe('#nbformat', () => {
      it('should get the major version number of the nbformat', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
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
        model.initialize();
        expect(model.nbformat).toBe(nbformat.MAJOR_VERSION);
        return acceptDialog();
      });
    });

    describe('#nbformatMinor', () => {
      it('should get the minor version number of the nbformat', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        expect(model.nbformatMinor).toBe(nbformat.MINOR_VERSION);
      });
    });

    describe('#defaultKernelName()', () => {
      it('should get the default kernel name of the document', () => {
        const model = new NotebookModel();
        model.initialize();
        model.metadata.set('kernelspec', { name: 'python3' });
        expect(model.defaultKernelName).toBe('python3');
      });

      it('should default to an empty string', () => {
        const model = new NotebookModel();
        model.initialize();
        expect(model.defaultKernelName).toBe('');
      });
    });

    describe('#defaultKernelLanguage', () => {
      it('should get the default kernel language of the document', () => {
        const model = new NotebookModel();
        model.initialize();
        model.metadata.set('language_info', { name: 'python' });
        expect(model.defaultKernelLanguage).toBe('python');
      });

      it('should default to an empty string', () => {
        const model = new NotebookModel();
        model.initialize();
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
        model.initialize();
        model.dispose();
        expect(model.cells).toBeNull();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new NotebookModel();
        model.initialize();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toString()', () => {
      it('should serialize the model to a string', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        const text = model.toString();
        const data = JSON.parse(text);
        expect(data.cells.length).toBe(7);
      });
    });

    describe('#fromString()', () => {
      it('should deserialize the model from a string', () => {
        const model = new NotebookModel();
        model.fromString(JSON.stringify(utils.DEFAULT_CONTENT));
        model.initialize();
        expect(model.cells.length).toBe(7);
      });

      it('should set the dirty flag', () => {
        const model = new NotebookModel();
        model.initialize();
        model.dirty = false;
        model.fromString(JSON.stringify(utils.DEFAULT_CONTENT));
        expect(model.dirty).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        const data = model.toJSON();
        expect(data.cells.length).toBe(7);
      });
      it('should serialize format 4.4 or earlier without cell ids', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        const data = model.toJSON();
        expect(data.nbformat).toBe(4);
        expect(data.nbformat_minor).toBeLessThanOrEqual(4);
        expect(data.cells.length).toBe(7);
        expect(data.cells[0].id).toBeUndefined();
      });
      it('should serialize format 4.5 or later with cell ids', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT_45);
        model.initialize();
        const data = model.toJSON();
        expect(data.cells.length).toBe(7);
        expect(data.cells[0].id).toBe('cell_1');
      });
    });

    describe('#fromJSON()', () => {
      it('should serialize the model from format<=4.4 JSON', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.initialize();
        expect(model.cells.length).toBe(7);
        expect(model.nbformat).toBe(utils.DEFAULT_CONTENT.nbformat);
        expect(model.nbformatMinor).toBe(nbformat.MINOR_VERSION);
      });

      it('should serialize the model from format 4.5 JSON', () => {
        const model = new NotebookModel();
        const json = utils.DEFAULT_CONTENT_45;
        model.fromJSON(json);
        model.initialize();
        expect(model.cells.length).toBe(7);
        expect(model.nbformat).toBe(json.nbformat);
        expect(model.nbformatMinor).toBe(json.nbformat_minor);
        expect(model.cells.get(0).id).toBe('cell_1');
      });

      it('should set the dirty flag', () => {
        const model = new NotebookModel();
        model.initialize();
        model.dirty = false;
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.dirty).toBe(true);
      });
    });

    describe('#metadata', () => {
      it('should have default values', () => {
        const model = new NotebookModel();
        model.initialize();
        const metadata = model.metadata;
        expect(metadata.has('kernelspec')).toBeTruthy();
        expect(metadata.has('language_info')).toBeTruthy();
        expect(metadata.size).toBe(2);
      });

      it('should set the dirty flag when changed', () => {
        const model = new NotebookModel();
        model.initialize();
        expect(model.dirty).toBe(false);
        model.metadata.set('foo', 'bar');
        expect(model.dirty).toBe(true);
      });

      it('should emit the `contentChanged` signal', () => {
        const model = new NotebookModel();
        model.initialize();
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        model.metadata.set('foo', 'bar');
        expect(called).toBe(true);
      });

      it('should emit the `metadataChanged` signal', () => {
        const model = new NotebookModel();
        model.initialize();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).toBe(model.metadata);
          expect(args[0].key).toBe('foo');
          expect(args[0].oldValue).toBeUndefined();
          expect(args[0].newValue).toBe('bar');
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
        const cell = model.contentFactory.createCodeCell();
        model.cells.push(cell);
        cell.value.text = 'foo';
        expect(model.cells.canUndo).toBe(true);
        model.initialize();
        expect(model.cells.canUndo).toBe(false);
      });
    });

    describe('.ContentFactory', () => {
      const model = new NotebookModel();
      model.initialize();
      const factory = model.contentFactory;

      describe('#codeCellContentFactory', () => {
        it('should be a code cell content factory', () => {
          expect(factory.codeCellContentFactory).toBe(
            CodeCellModel.defaultContentFactory
          );
        });

        it('should be settable in the constructor', () => {
          const codeCellContentFactory = new CodeCellModel.ContentFactory();
          const factory = new NotebookModel.ContentFactory({
            sharedDoc: new SharedDoc(),
            codeCellContentFactory
          });
          expect(factory.codeCellContentFactory).toBe(codeCellContentFactory);
        });
      });

      describe('#createCell()', () => {
        it('should create a new code cell', () => {
          const cell = factory.createCell('code');
          model.cells.push(cell);
          expect(cell.type).toBe('code');
        });

        it('should create a new markdown cell', () => {
          const cell = factory.createCell('markdown');
          model.cells.push(cell);
          expect(cell.type).toBe('markdown');
        });

        it('should create a new raw cell', () => {
          const cell = factory.createCell('raw');
          model.cells.push(cell);
          expect(cell.type).toBe('raw');
        });
      });

      describe('#createCodeCell()', () => {
        it('should create a new code cell', () => {
          const cell = factory.createCodeCell();
          model.cells.push(cell);
          expect(cell.type).toBe('code');
        });

        it('should clone an existing code cell', () => {
          const orig = factory.createCodeCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createCodeCell(undefined, cell);
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON() as nbformat.IBaseCell;
          const newCell = factory.createCodeCell(
            undefined,
            cell as nbformat.ICodeCell
          );
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#createRawCell()', () => {
        it('should create a new raw cell', () => {
          const cell = factory.createRawCell();
          model.cells.push(cell);
          expect(cell.type).toBe('raw');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createRawCell(undefined, cell);
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing code cell', () => {
          const orig = factory.createCodeCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON() as nbformat.IBaseCell;
          const newCell = factory.createRawCell(
            undefined,
            cell as nbformat.IRawCell
          );
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#createMarkdownCell()', () => {
        it('should create a new markdown cell', () => {
          const cell = factory.createMarkdownCell();
          model.cells.push(cell);
          expect(cell.type).toBe('markdown');
        });

        it('should clone an existing markdown cell', () => {
          const orig = factory.createMarkdownCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON();
          const newCell = factory.createMarkdownCell(undefined, cell);
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });

        it('should clone an existing raw cell', () => {
          const orig = factory.createRawCell();
          model.cells.push(orig);
          orig.value.text = 'foo';
          const cell = orig.toJSON() as nbformat.IBaseCell;
          const newCell = factory.createMarkdownCell(
            undefined,
            cell as nbformat.IMarkdownCell
          );
          model.cells.push(newCell);
          expect(newCell.value.text).toBe('foo');
        });
      });

      describe('#clone()', () => {
        it('should create a new content factory with a new ISharedDoc', () => {
          const sharedDoc = new SharedDoc();
          const factory = new NotebookModel.ContentFactory({ sharedDoc });
          //@ts-ignore
          expect(factory._sharedDoc).toBe(sharedDoc);
          const newsharedDoc = new SharedDoc();
          const newFactory = factory.clone(newsharedDoc);
          //@ts-ignore
          expect(newFactory._sharedDoc).toBe(newsharedDoc);
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
