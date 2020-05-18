// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { toArray } from '@lumino/algorithm';

import { IChangedArgs } from '@jupyterlab/coreutils';

import {
  CellModel,
  RawCellModel,
  MarkdownCellModel,
  CodeCellModel
} from '@jupyterlab/cells';

import * as nbformat from '@jupyterlab/nbformat';

import { OutputAreaModel } from '@jupyterlab/outputarea';

import { NBTestUtils } from '@jupyterlab/testutils';
import { JSONObject } from '@lumino/coreutils';

class TestModel extends CellModel {
  get type(): 'raw' {
    return 'raw';
  }
}

describe('cells/model', () => {
  describe('CellModel', () => {
    describe('#constructor()', () => {
      it('should create a cell model', () => {
        const model = new CellModel({});
        expect(model).toBeInstanceOf(CellModel);
      });

      it('should accept a base cell argument', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new CellModel({ cell });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.value.text).toBe(cell.source);
      });

      it('should accept a base cell argument with a multiline source', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = new CellModel({ cell });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.value.text).toBe((cell.source as string[]).join(''));
      });
    });

    describe('#contentChanged', () => {
      it('should signal when model content has changed', () => {
        const model = new CellModel({});
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        expect(called).toBe(false);
        model.value.text = 'foo';
        expect(called).toBe(true);
      });
    });

    describe('#stateChanged', () => {
      it('should signal when model state has changed', () => {
        const model = new CodeCellModel({});
        let called = false;
        const listener = (sender: any, args: IChangedArgs<any>) => {
          expect(args.newValue).toBe(1);
          called = true;
        };
        model.stateChanged.connect(listener);
        model.executionCount = 1;
        expect(called).toBe(true);
      });

      it('should not signal when model state has not changed', () => {
        const model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => {
          called++;
        });
        expect(called).toBe(0);
        model.executionCount = 1;
        expect(called).toBe(1);
        model.executionCount = 1;
        expect(called).toBe(1);
      });
    });

    describe('#trusted', () => {
      it('should be the trusted state of the cell', () => {
        const model = new CodeCellModel({});
        expect(model.trusted).toBe(false);
        model.trusted = true;
        expect(model.trusted).toBe(true);
        const other = new CodeCellModel({ cell: model.toJSON() });
        expect(other.trusted).toBe(true);
      });

      it('should update the trusted state of the output models', () => {
        const model = new CodeCellModel({});
        model.outputs.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.outputs.get(0).trusted).toBe(false);
        model.trusted = true;
        expect(model.outputs.get(0).trusted).toBe(true);
      });
    });

    describe('#metadataChanged', () => {
      it('should signal when model metadata has changed', () => {
        const model = new TestModel({});
        const listener = (sender: any, args: any) => {
          value = args.newValue;
        };
        let value = '';
        model.metadata.changed.connect(listener);
        expect(Object.keys(value)).toHaveLength(0);
        model.metadata.set('foo', 'bar');
        expect(value).toBe('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        const model = new TestModel({});
        let called = 0;
        model.metadata.changed.connect(() => {
          called++;
        });
        expect(called).toBe(0);
        model.metadata.set('foo', 'bar');
        expect(called).toBe(1);
        model.metadata.set('foo', 'bar');
        expect(called).toBe(1);
      });
    });

    describe('#source', () => {
      it('should default to an empty string', () => {
        const model = new CellModel({});
        expect(model.value.text).toHaveLength(0);
      });

      it('should be settable', () => {
        const model = new CellModel({});
        expect(model.value.text).toHaveLength(0);
        model.value.text = 'foo';
        expect(model.value.text).toBe('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should be false by default', () => {
        const model = new CellModel({});
        expect(model.isDisposed).toBe(false);
      });

      it('should be true after model is disposed', () => {
        const model = new CellModel({});
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new TestModel({});
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new CellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should return a base cell encapsulation of the model value', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new TestModel({ cell });
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });

      it('should always return a string source', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = new TestModel({ cell });
        cell.source = (cell.source as string[]).join('');
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });
    });

    describe('#metadata', () => {
      it('should handle a metadata for the cell', () => {
        const model = new CellModel({});
        expect(model.metadata.get('foo')).toBeUndefined();
        model.metadata.set('foo', 1);
        expect(model.metadata.get('foo')).toBe(1);
      });

      it('should get a list of user metadata keys', () => {
        const model = new CellModel({});
        expect(toArray(model.metadata.keys())).toHaveLength(0);
        model.metadata.set('foo', 1);
        expect(model.metadata.keys()).toEqual(['foo']);
      });

      it('should trigger changed signal', () => {
        const model = new CellModel({});
        let called = false;
        model.metadata.changed.connect(() => {
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).toBe(true);
      });
    });
  });

  describe('RawCellModel', () => {
    describe('#type', () => {
      it('should be set with type "raw"', () => {
        const model = new RawCellModel({});
        expect(model.type).toBe('raw');
      });
    });
  });

  describe('MarkdownCellModel', () => {
    describe('#type', () => {
      it('should be set with type "markdown"', () => {
        const model = new MarkdownCellModel({});
        expect(model.type).toBe('markdown');
      });
    });
  });

  describe('CodeCellModel', () => {
    describe('#constructor()', () => {
      it('should create a code cell model', () => {
        const model = new CodeCellModel({});
        expect(model).toBeInstanceOf(CodeCellModel);
      });

      it('should accept a code cell argument', () => {
        const cell: nbformat.ICodeCell = {
          cell_type: 'code',
          execution_count: 1,
          outputs: [
            {
              output_type: 'display_data',
              data: { 'text/plain': 'foo' },
              metadata: {}
            } as nbformat.IDisplayData
          ],
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new CodeCellModel({ cell });
        expect(model).toBeInstanceOf(CodeCellModel);
        expect(model.value.text).toBe(cell.source);
      });

      it('should connect the outputs changes to content change signal', () => {
        const data = {
          output_type: 'display_data',
          data: { 'text/plain': 'foo' },
          metadata: {}
        } as nbformat.IDisplayData;
        const model = new CodeCellModel({});
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        expect(called).toBe(false);
        model.outputs.add(data);
        expect(called).toBe(true);
      });

      it('should sync collapsed and jupyter.outputs_hidden metadata on construction', () => {
        let model: CodeCellModel;
        let jupyter: JSONObject | undefined;

        // Setting `collapsed` works
        model = new CodeCellModel({
          cell: { cell_type: 'code', source: '', metadata: { collapsed: true } }
        });
        expect(model.metadata.get('collapsed')).toBe(true);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // Setting `jupyter.outputs_hidden` works
        model = new CodeCellModel({
          cell: {
            cell_type: 'code',
            source: '',
            metadata: { jupyter: { outputs_hidden: true } }
          }
        });
        expect(model.metadata.get('collapsed')).toBe(true);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // `collapsed` takes precedence
        model = new CodeCellModel({
          cell: {
            cell_type: 'code',
            source: '',
            metadata: { collapsed: false, jupyter: { outputs_hidden: true } }
          }
        });
        expect(model.metadata.get('collapsed')).toBe(false);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(false);
      });
    });

    describe('#type', () => {
      it('should be set with type "code"', () => {
        const model = new CodeCellModel({});
        expect(model.type).toBe('code');
      });
    });

    describe('#executionCount', () => {
      it('should show the execution count of the cell', () => {
        const cell: nbformat.ICodeCell = {
          cell_type: 'code',
          execution_count: 1,
          outputs: [],
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new CodeCellModel({ cell });
        expect(model.executionCount).toBe(1);
      });

      it('should be settable', () => {
        const model = new CodeCellModel({});
        expect(model.executionCount).toBeNull();
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
      });

      it('should emit a state change signal when set', () => {
        const model = new CodeCellModel({});
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        expect(model.executionCount).toBeNull();
        expect(called).toBe(false);
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
        expect(called).toBe(true);
      });

      it('should not signal when state has not changed', () => {
        const model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => {
          called++;
        });
        expect(model.executionCount).toBeNull();
        expect(called).toBe(0);
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
        model.executionCount = 1;
        expect(called).toBe(1);
      });
    });

    describe('#outputs', () => {
      it('should be an output area model', () => {
        const model = new CodeCellModel({});
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new CodeCellModel({});
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).toBe(true);
        expect(model.outputs).toBeNull();
      });

      it('should be safe to call multiple times', () => {
        const model = new CodeCellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should return a code cell encapsulation of the model value', () => {
        const cell: nbformat.ICodeCell = {
          cell_type: 'code',
          execution_count: 1,
          outputs: [
            {
              output_type: 'display_data',
              data: {
                'text/plain': 'foo',
                'application/json': { bar: 1 }
              },
              metadata: {}
            } as nbformat.IDisplayData
          ],
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new CodeCellModel({ cell });
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
        const output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).toBe(1);
      });
    });

    describe('.metadata', () => {
      it('should sync collapsed and jupyter.outputs_hidden metadata when changed', () => {
        const metadata = new CodeCellModel({}).metadata;

        expect(metadata.get('collapsed')).toBeUndefined();
        expect(metadata.get('jupyter')).toBeUndefined();

        // Setting collapsed sets jupyter.outputs_hidden
        metadata.set('collapsed', true);
        expect(metadata.get('collapsed')).toBe(true);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: true
        });

        metadata.set('collapsed', false);
        expect(metadata.get('collapsed')).toBe(false);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: false
        });

        metadata.delete('collapsed');
        expect(metadata.get('collapsed')).toBeUndefined();
        expect(metadata.get('jupyter')).toBeUndefined();

        // Setting jupyter.outputs_hidden sets collapsed
        metadata.set('jupyter', { outputs_hidden: true });
        expect(metadata.get('collapsed')).toBe(true);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: true
        });

        metadata.set('jupyter', { outputs_hidden: false });
        expect(metadata.get('collapsed')).toBe(false);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: false
        });

        metadata.delete('jupyter');
        expect(metadata.get('collapsed')).toBeUndefined();
        expect(metadata.get('jupyter')).toBeUndefined();

        // Deleting jupyter.outputs_hidden preserves other jupyter fields
        metadata.set('jupyter', { outputs_hidden: true, other: true });
        expect(metadata.get('collapsed')).toBe(true);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: true,
          other: true
        });
        metadata.set('jupyter', { other: true });
        expect(metadata.get('collapsed')).toBeUndefined();
        expect(metadata.get('jupyter')).toEqual({
          other: true
        });

        // Deleting collapsed preserves other jupyter fields
        metadata.set('jupyter', { outputs_hidden: true, other: true });
        expect(metadata.get('collapsed')).toBe(true);
        expect(metadata.get('jupyter')).toEqual({
          outputs_hidden: true,
          other: true
        });
        metadata.delete('collapsed');
        expect(metadata.get('collapsed')).toBeUndefined();
        expect(metadata.get('jupyter')).toEqual({
          other: true
        });
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor()', () => {
        it('should create a new output area factory', () => {
          const factory = new CodeCellModel.ContentFactory();
          expect(factory).toBeInstanceOf(CodeCellModel.ContentFactory);
        });
      });

      describe('#createOutputArea()', () => {
        it('should create an output area model', () => {
          const factory = new CodeCellModel.ContentFactory();
          expect(factory.createOutputArea({ trusted: true })).toBeInstanceOf(
            OutputAreaModel
          );
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be an ContentFactory', () => {
        expect(CodeCellModel.defaultContentFactory).toBeInstanceOf(
          CodeCellModel.ContentFactory
        );
      });
    });
  });
});
