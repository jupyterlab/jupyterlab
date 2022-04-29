// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { toArray } from '@lumino/algorithm';

import { IChangedArgs } from '@jupyterlab/coreutils';

import {
  CellModel,
  CodeCellModel,
  MarkdownCellModel,
  RawCellModel
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
        const model = CellModel.createStandaloneModel();
        expect(model).toBeInstanceOf(CellModel);
      });

      it('should accept a base cell argument', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = CellModel.createStandaloneModel(undefined, cell);
        expect(model).toBeInstanceOf(CellModel);
        expect(model.value.text).toBe(cell.source);
      });

      it('should accept a base cell argument with a multiline source', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false },
          id: 'cell_id'
        };
        const model = CellModel.createStandaloneModel(undefined, cell);
        expect(model).toBeInstanceOf(CellModel);
        expect(model.value.text).toBe((cell.source as string[]).join(''));
      });

      it('should use the id argument', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false },
          id: 'cell_id'
        };
        const model = CellModel.createStandaloneModel('my_id', cell);
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id).toBe('my_id');
      });

      it('should use the cell id if an id is not supplied', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false },
          id: 'cell_id'
        };
        const model = CellModel.createStandaloneModel(undefined, cell);
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id).toBe('cell_id');
      });

      it('should generate an id if an id or cell id is not supplied', () => {
        const cell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = CellModel.createStandaloneModel(undefined, cell);
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id.length).toBeGreaterThan(0);
      });
    });

    describe('#contentChanged', () => {
      it('should signal when model content has changed', () => {
        const model = CellModel.createStandaloneModel();
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
        const model = CodeCellModel.createStandaloneModel();
        let called = false;
        const listener = (sender: any, args: IChangedArgs<any>) => {
          if (args.name == 'executionCount') {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(args.newValue).toBe(1);
            called = true;
          }
        };
        model.stateChanged.connect(listener);
        model.executionCount = 1;
        expect(called).toBe(true);
      });

      it('should not signal when model state has not changed', () => {
        const model = CodeCellModel.createStandaloneModel();
        let called = 0;
        model.stateChanged.connect((model, args) => {
          if (args.name == 'executionCount') {
            called++;
          }
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
        const model = CodeCellModel.createStandaloneModel();
        expect(model.trusted).toBe(false);
        model.trusted = true;
        expect(model.trusted).toBe(true);
        const other = CodeCellModel.createStandaloneModel(
          undefined,
          model.toJSON()
        );
        expect(other.trusted).toBe(true);
      });

      it('should update the trusted state of the output models', () => {
        const model = CodeCellModel.createStandaloneModel();
        model.outputs.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.outputs.get(0).trusted).toBe(false);
        model.trusted = true;
        expect(model.outputs.get(0).trusted).toBe(true);
      });
    });

    describe('#metadataChanged', () => {
      it('should signal when model metadata has changed', () => {
        const model = TestModel.createStandaloneModel();
        const listener = (sender: any, args: any) => {
          value = args[0].newValue;
        };
        let value = '';
        model.metadata.changed.connect(listener);
        expect(Object.keys(value)).toHaveLength(0);
        model.metadata.set('foo', 'bar');
        expect(value).toBe('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        const model = TestModel.createStandaloneModel();
        let called = 0;
        model.metadata.changed.connect(() => {
          called++;
        });
        expect(called).toBe(0);
        model.metadata.set('foo', 'bar');
        expect(called).toBe(1);
        // Not possible anymore, the SharedMap always emits the signal
        //model.metadata.set('foo', 'bar');
        //expect(called).toBe(1);
      });
    });

    describe('#source', () => {
      it('should default to an empty string', () => {
        const model = CellModel.createStandaloneModel();
        expect(model.value.text).toHaveLength(0);
      });

      it('should be settable', () => {
        const model = CellModel.createStandaloneModel();
        expect(model.value.text).toHaveLength(0);
        model.value.text = 'foo';
        expect(model.value.text).toBe('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should be false by default', () => {
        const model = CellModel.createStandaloneModel();
        expect(model.isDisposed).toBe(false);
      });

      it('should be true after model is disposed', () => {
        const model = CellModel.createStandaloneModel();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = TestModel.createStandaloneModel();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = CellModel.createStandaloneModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should return a base cell encapsulation of the model value', () => {
        const cell: nbformat.IRawCell = {
          id: '58c077e3-0787-4e28-ab48-fe191720b29a',
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = TestModel.createStandaloneModel(undefined, cell);
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });

      it('should always return a string source', () => {
        const cell: nbformat.IRawCell = {
          id: '58c077e3-0787-4e28-ab48-fe191720b29a',
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = TestModel.createStandaloneModel(undefined, cell);
        cell.source = (cell.source as string[]).join('');
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });
    });

    describe('#metadata', () => {
      it('should handle a metadata for the cell', () => {
        const model = CellModel.createStandaloneModel();
        expect(model.metadata.get('foo')).toBeUndefined();
        model.metadata.set('foo', 1);
        expect(model.metadata.get('foo')).toBe(1);
      });

      it('should get a list of user metadata keys', () => {
        const model = CellModel.createStandaloneModel();
        expect(toArray(model.metadata.keys())).toHaveLength(0);
        model.metadata.set('foo', 1);
        expect(model.metadata.keys()).toEqual(['foo']);
      });

      it('should trigger changed signal', () => {
        const model = CellModel.createStandaloneModel();
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
        const model = RawCellModel.createStandaloneModel();
        expect(model.type).toBe('raw');
      });
    });
    describe('#toJSON()', () => {
      it('should return a raw cell encapsulation of the model value', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: {},
          id: 'cell_id'
        };
        const model = RawCellModel.createStandaloneModel(undefined, cell);
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
      });
    });
  });

  describe('MarkdownCellModel', () => {
    describe('#type', () => {
      it('should be set with type "markdown"', () => {
        const model = MarkdownCellModel.createStandaloneModel();
        expect(model.type).toBe('markdown');
      });
    });
    describe('#toJSON()', () => {
      it('should return a markdown cell encapsulation of the model value', () => {
        const cell: nbformat.IMarkdownCell = {
          cell_type: 'markdown',
          source: 'foo',
          metadata: {},
          id: 'cell_id'
        };
        const model = MarkdownCellModel.createStandaloneModel(undefined, cell);
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
      });
    });
  });

  describe('CodeCellModel', () => {
    describe('#constructor()', () => {
      it('should create a code cell model', () => {
        const model = CodeCellModel.createStandaloneModel();
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
            }
          ],
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = CodeCellModel.createStandaloneModel(undefined, cell);
        expect(model).toBeInstanceOf(CodeCellModel);
        expect(model.value.text).toBe(cell.source);
      });

      it('should connect the outputs changes to content change signal', () => {
        const data = {
          output_type: 'display_data',
          data: { 'text/plain': 'foo' },
          metadata: {}
        } as nbformat.IDisplayData;
        const model = CodeCellModel.createStandaloneModel();
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
        model = CodeCellModel.createStandaloneModel(undefined, {
          cell_type: 'code',
          source: '',
          metadata: { collapsed: true },
          outputs: [],
          execution_count: 0
        });
        expect(model.metadata.get('collapsed')).toBe(true);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // Setting `jupyter.outputs_hidden` works
        model = CodeCellModel.createStandaloneModel(undefined, {
          cell_type: 'code',
          source: '',
          metadata: { jupyter: { outputs_hidden: true } },
          outputs: [],
          execution_count: 0
        });
        expect(model.metadata.get('collapsed')).toBe(true);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // `collapsed` takes precedence
        model = CodeCellModel.createStandaloneModel(undefined, {
          cell_type: 'code',
          source: '',
          metadata: { collapsed: false, jupyter: { outputs_hidden: true } },
          outputs: [],
          execution_count: 0
        });
        expect(model.metadata.get('collapsed')).toBe(false);
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(false);
      });
    });

    describe('#type', () => {
      it('should be set with type "code"', () => {
        const model = CodeCellModel.createStandaloneModel();
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
        const model = CodeCellModel.createStandaloneModel(undefined, cell);
        expect(model.executionCount).toBe(1);
      });

      it('should be settable', () => {
        const model = CodeCellModel.createStandaloneModel();
        expect(model.executionCount).toBeNull();
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
      });

      it('should emit a state change signal when set', () => {
        const model = CodeCellModel.createStandaloneModel();
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
        const model = CodeCellModel.createStandaloneModel();
        let called = 0;
        model.stateChanged.connect((model, args) => {
          if (args.name == 'executionCount') {
            called++;
          }
        });
        expect(model.executionCount).toBeNull();
        expect(called).toBe(0);
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
        model.executionCount = 1;
        expect(called).toBe(1);
      });

      it('should set dirty flag and signal', () => {
        const model = CodeCellModel.createStandaloneModel();
        let called = 0;
        model.stateChanged.connect((model, args) => {
          if (args.name == 'isDirty') {
            called++;
          }
        });
        expect(model.executionCount).toBeNull();
        expect(model.isDirty).toBe(false);
        expect(called).toBe(0);

        model.executionCount = 1;
        expect(model.isDirty).toBe(false);
        expect(called).toBe(0);

        model.value.text = 'foo';
        expect(model.isDirty).toBe(true);
        expect(called).toBe(1);

        model.executionCount = 2;
        expect(model.isDirty).toBe(false);
        expect(called).toBe(2);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = CodeCellModel.createStandaloneModel();
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).toBe(true);
        expect(model.outputs).toBeNull();
      });

      it('should be safe to call multiple times', () => {
        const model = CodeCellModel.createStandaloneModel();
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
            }
          ],
          source: 'foo',
          metadata: { trusted: false },
          id: 'cell_id'
        };
        const model = CodeCellModel.createStandaloneModel(undefined, cell);
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
        const output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).toBe(1);
      });
    });

    describe('#outputs', () => {
      const output0 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'foo',
          'application/json': { foo: 1 }
        },
        metadata: {}
      } as nbformat.IOutput;
      const output1 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'bar',
          'application/json': { bar: 2 }
        },
        metadata: {}
      } as nbformat.IOutput;
      const output2 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'foobar',
          'application/json': { foobar: 2 }
        },
        metadata: {}
      } as nbformat.IOutput;
      const cell: nbformat.ICodeCell = {
        cell_type: 'code',
        execution_count: 1,
        outputs: [output0, output1],
        source: 'foo',
        metadata: { trusted: false },
        id: 'cell_id'
      };

      it('should be an output area model', () => {
        const model = CodeCellModel.createStandaloneModel();
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
      });

      it('should add new items correctly', () => {
        const model = CodeCellModel.createStandaloneModel();
        expect(model.outputs.length).toBe(0);
        model.outputs.add(output0);
        expect(model.outputs.length).toBe(1);
        expect(model.outputs.get(0).toJSON()).toEqual(output0);
      });

      it('should set new items correctly', () => {
        const model = CodeCellModel.createStandaloneModel(undefined, cell);
        expect(model.outputs.length).toBe(2);

        model.outputs.set(0, output2);
        expect(model.outputs.length).toBe(2);
        expect(model.outputs.get(0).toJSON()).toEqual(output2);

        model.outputs.set(1, output2);
        expect(model.outputs.length).toBe(2);
        expect(model.outputs.get(0).toJSON()).toEqual(output2);
      });

      it('should remove items correctly', () => {
        const model = CodeCellModel.createStandaloneModel(undefined, cell);
        expect(model.outputs.length).toBe(2);

        model.outputs.clear();
        expect(model.outputs.length).toBe(0);
      });
    });

    describe('.metadata', () => {
      it('should sync collapsed and jupyter.outputs_hidden metadata when changed', () => {
        const metadata = CodeCellModel.createStandaloneModel().metadata;

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
