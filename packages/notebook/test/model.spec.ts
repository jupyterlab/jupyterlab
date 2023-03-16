// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { acceptDialog } from '@jupyterlab/testing';
import { NotebookModel } from '@jupyterlab/notebook';
import * as utils from './utils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookModel', () => {
    describe('#constructor()', () => {
      it('should create a notebook model', () => {
        const model = new NotebookModel({});
        expect(model).toBeInstanceOf(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        const model = new NotebookModel({ languagePreference: 'python' });
        const lang = model.getMetadata(
          'language_info'
        ) as nbformat.ILanguageInfoMetadata;
        expect(lang.name).toBe('python');
      });
    });

    describe('#metadataChanged', () => {
      it('should be emitted when a metadata field changes', () => {
        const model = new NotebookModel();
        let called = false;
        model.metadataChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.key).toBe('foo');
          expect(args.oldValue).toBeUndefined();
          expect(args.newValue).toBe(1);
          called = true;
        });
        model.setMetadata('foo', 1);
        expect(called).toBe(true);
      });

      it('should not be emitted when the value does not change', () => {
        const model = new NotebookModel();
        let called = false;
        model.setMetadata('foo', 1);
        model.metadataChanged.connect(() => {
          called = true;
        });
        model.setMetadata('foo', 1);
        expect(called).toBe(false);
      });
    });

    describe('#cells', () => {
      it('should be reset when loading from disk', () => {
        const model = new NotebookModel();
        model.sharedModel.insertCell(0, { cell_type: 'code' });
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.cells.length).toBe(7);
      });

      it('should allow undoing a change', () => {
        const model = new NotebookModel();
        const cell = model.sharedModel.insertCell(0, {
          cell_type: 'code',
          source: 'foo'
        });
        const cellJSON = cell.toJSON();
        model.sharedModel.clearUndoHistory();
        model.sharedModel.deleteCell(0);
        model.sharedModel.undo();
        expect(model.cells.length).toBe(1);
        expect(model.cells.get(0).sharedModel.getSource()).toBe('foo');
        // Previous model matches the restored model
        expect(model.cells.get(0).toJSON()).toEqual(cellJSON);
      });

      describe('cells `changed` signal', () => {
        it('should emit a `contentChanged` signal upon cell addition', () => {
          const model = new NotebookModel();
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.sharedModel.insertCell(0, { cell_type: 'code' });
          expect(called).toBe(true);
        });

        it('should emit a `contentChanged` signal upon cell removal', () => {
          const model = new NotebookModel();
          model.sharedModel.insertCell(0, { cell_type: 'code' });
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.sharedModel.deleteCell(0);
          expect(called).toBe(true);
        });

        it('should emit a `contentChanged` signal upon cell move', () => {
          const model = new NotebookModel();
          model.sharedModel.insertCells(0, [
            { cell_type: 'code' },
            { cell_type: 'code' }
          ]);
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.sharedModel.moveCell(0, 1);
          expect(called).toBe(true);
        });

        it('should set the dirty flag', () => {
          const model = new NotebookModel();
          model.sharedModel.insertCell(0, { cell_type: 'code' });
          expect(model.dirty).toBe(true);
        });
      });

      describe('cell `changed` signal', () => {
        it('should be called when a cell content changes', () => {
          const model = new NotebookModel();
          const cell = model.sharedModel.insertCell(0, { cell_type: 'code' });
          expect(() => {
            cell.setSource('foo');
          }).not.toThrow();
        });

        it('should emit the `contentChanged` signal', () => {
          const model = new NotebookModel();
          model.sharedModel.insertCell(0, { cell_type: 'code' });
          let called = false;
          model.contentChanged.connect(() => {
            called = true;
          });
          model.setMetadata('foo', 'bar');
          expect(called).toBe(true);
        });

        it('should set the dirty flag', () => {
          const model = new NotebookModel();
          const cell = model.sharedModel.insertCell(0, { cell_type: 'code' });
          model.dirty = false;
          cell.setSource('foo');
          expect(model.dirty).toBe(true);
        });
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
        model.setMetadata('kernelspec', { name: 'python3' });
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
        model.setMetadata('language_info', { name: 'python' });
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
        expect(data.cells.length).toBe(7);
      });
    });

    describe('#fromString()', () => {
      it('should deserialize the model from a string', () => {
        const model = new NotebookModel();
        model.fromString(JSON.stringify(utils.DEFAULT_CONTENT));
        expect(model.cells.length).toBe(7);
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
        expect(data.cells.length).toBe(7);
      });
      it('should serialize format 4.4 or earlier without cell ids', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        const data = model.toJSON();
        expect(data.nbformat).toBe(4);
        expect(data.nbformat_minor).toBeLessThanOrEqual(4);
        expect(data.cells.length).toBe(7);
        expect(data.cells[0].id).toBeUndefined();
      });
      it('should serialize format 4.5 or later with cell ids', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT_45);
        const data = model.toJSON();
        expect(data.cells.length).toBe(7);
        expect(data.cells[0].id).toBe('cell_1');
      });
      it('should only include `trusted` metadata in code cells', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT_45);

        [...model.cells].map(cell => (cell.trusted = true));
        expect(model.cells.get(0).type).toBe('code');
        expect(model.cells.get(1).type).toBe('markdown');
        expect(model.cells.get(2).type).toBe('raw');

        const data = model.toJSON();
        // code cell trust should be preserved
        expect(data.cells[0].metadata.trusted).toBe(true);
        // markdown cell should have no trusted entry
        expect(data.cells[1].metadata.trusted).toBeUndefined();
        // raw cell should have no trusted entry
        expect(data.cells[2].metadata.trusted).toBeUndefined();
      });
    });

    describe('#fromJSON()', () => {
      it('should serialize the model from format<=4.4 JSON', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.cells.length).toBe(7);
        expect(model.nbformat).toBe(utils.DEFAULT_CONTENT.nbformat);
        expect(model.nbformatMinor).toBe(nbformat.MINOR_VERSION);
      });

      it('should serialize the model from format 4.5 JSON', () => {
        const model = new NotebookModel();
        const json = utils.DEFAULT_CONTENT_45;
        model.fromJSON(json);
        expect(model.cells.length).toBe(7);
        expect(model.nbformat).toBe(json.nbformat);
        expect(model.nbformatMinor).toBe(json.nbformat_minor);
        expect(model.cells.get(0).id).toBe('cell_1');
      });

      it('should set the dirty flag', () => {
        const model = new NotebookModel();
        model.dirty = false;
        model.fromJSON(utils.DEFAULT_CONTENT);
        expect(model.dirty).toBe(true);
      });

      it('should populate empty notebook with empty trusted code cell', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.EMPTY_CONTENT);
        const cell = model.cells.get(0);
        expect(cell.trusted).toBe(true);
      });
    });

    describe('#metadata', () => {
      it('should have default values', () => {
        const model = new NotebookModel();
        const metadata = model.metadata;
        expect(metadata['kernelspec']).toBeTruthy();
        expect(metadata['language_info']).toBeTruthy();
        expect(Object.keys(metadata)).toHaveLength(2);
      });

      it('should set the dirty flag when changed', () => {
        const model = new NotebookModel();
        expect(model.dirty).toBe(false);
        model.setMetadata('foo', 'bar');
        expect(model.dirty).toBe(true);
      });

      it('should emit the `contentChanged` signal', () => {
        const model = new NotebookModel();
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        model.setMetadata('foo', 'bar');
        expect(called).toBe(true);
      });

      it('should emit the `metadataChanged` signal', () => {
        const model = new NotebookModel();
        let called = false;
        model.metadataChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.key).toBe('foo');
          expect(args.oldValue).toBeUndefined();
          expect(args.newValue).toBe('bar');
          called = true;
        });
        model.setMetadata('foo', 'bar');
        expect(called).toBe(true);
      });
    });

    describe('#initialize()', () => {
      it('should be an empty model', () => {
        const model = new NotebookModel();
        expect(model.cells.length).toBe(0);
      });
    });
  });
});
