// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  createStandaloneCell,
  ISharedCodeCell,
  YCodeCell,
  YMarkdownCell,
  YRawCell
} from '@jupyter/ydoc';
import {
  CellModel,
  CodeCellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import { IChangedArgs } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { OutputAreaModel } from '@jupyterlab/outputarea';
import { DEFAULT_OUTPUTS } from '@jupyterlab/rendermime/lib/testutils';
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
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        expect(model).toBeInstanceOf(CellModel);
      });

      it('should accept a base cell argument', () => {
        const sharedModel = createStandaloneCell({
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        }) as YRawCell;
        const model = new TestModel({ sharedModel });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.sharedModel.getSource()).toBe('foo');
      });

      it('should accept a base cell argument with a multiline source', () => {
        const sharedModel = createStandaloneCell({
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false },
          id: 'cell_id'
        }) as YRawCell;
        const model = new TestModel({ sharedModel });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.sharedModel.getSource()).toBe('foo\nbar\nbaz');
      });

      it('should use the cell id if an id is supplied', () => {
        const sharedModel = createStandaloneCell({
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false },
          id: 'cell_id'
        }) as YRawCell;
        const model = new TestModel({ sharedModel, id: 'my_id' });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id).toBe('cell_id');
      });

      it('should use the id if an cell is not supplied', () => {
        const model = new TestModel({ id: 'cell_id' });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id).toBe('cell_id');
      });

      it('should generate an id if an id or cell id is not supplied', () => {
        const sharedModel = createStandaloneCell({
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        }) as YRawCell;
        const model = new TestModel({ sharedModel });
        expect(model).toBeInstanceOf(CellModel);
        expect(model.id.length).toBeGreaterThan(0);
      });
    });

    describe('#contentChanged', () => {
      it('should signal when model content has changed', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        expect(called).toBe(false);
        model.sharedModel.setSource('foo');
        expect(called).toBe(true);
      });
    });

    describe('#stateChanged', () => {
      it('should signal when model state has changed', () => {
        const model = new CodeCellModel();
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
        const model = new CodeCellModel();
        let called = 0;
        model.sharedModel.changed.connect((model, change) => {
          if (change.executionCountChange) {
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
        const model = new CodeCellModel();
        expect(model.trusted).toBe(false);
        model.trusted = true;
        expect(model.trusted).toBe(true);
        const other = new CodeCellModel({
          trusted: true
        });
        expect(other.trusted).toBe(true);
      });

      it('should update the trusted state of the output models', () => {
        const model = new CodeCellModel();
        model.outputs.add(DEFAULT_OUTPUTS[0]);
        expect(model.outputs.get(0).trusted).toBe(false);
        model.trusted = true;
        expect(model.outputs.get(0).trusted).toBe(true);
      });
    });

    describe('#metadataChanged', () => {
      it('should signal when model metadata has changed', () => {
        const model = new CodeCellModel();
        const listener = (sender: any, args: any) => {
          value = args.newValue;
        };
        let value = '';
        model.metadataChanged.connect(listener);
        expect(Object.keys(value)).toHaveLength(0);
        model.setMetadata('foo', 'bar');
        expect(value).toBe('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' })
        });
        let called = 0;
        model.metadataChanged.connect(() => {
          called++;
        });
        expect(called).toBe(0);
        model.setMetadata('foo', 'bar');
        expect(called).toBe(1);
        model.setMetadata('foo', 'bar');
        expect(called).toBe(1);
      });
    });

    describe('#source', () => {
      it('should default to an empty string', () => {
        const model = new CodeCellModel();
        expect(model.sharedModel.getSource()).toHaveLength(0);
      });

      it('should be settable', () => {
        const model = new CodeCellModel();
        expect(model.sharedModel.getSource()).toHaveLength(0);
        model.sharedModel.setSource('foo');
        expect(model.sharedModel.getSource()).toBe('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should be false by default', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        expect(model.isDisposed).toBe(false);
      });

      it('should be true after model is disposed', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' })
        });
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toJSON()', () => {
      it('should return a base cell encapsulation of the model value', () => {
        const cell: nbformat.IRawCell = {
          id: '42',
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new TestModel({
          sharedModel: createStandaloneCell(cell)
        });
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });

      it('should always return a string source', () => {
        const cell: nbformat.IRawCell = {
          id: '42',
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = new TestModel({
          sharedModel: createStandaloneCell(cell)
        });
        cell.source = (cell.source as string[]).join('');
        expect(model.toJSON()).not.toBe(cell);
        expect(model.toJSON()).toEqual(cell);
      });
    });

    describe('#metadata', () => {
      it('should handle a metadata for the cell', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        expect(model.getMetadata('foo')).toBeUndefined();
        model.setMetadata('foo', 1);
        expect(model.getMetadata('foo')).toBe(1);
      });

      it('should get a list of user metadata keys', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        expect(Array.from(Object.keys(model.metadata))).toHaveLength(0);
        model.setMetadata('foo', 1);
        expect(Object.keys(model.metadata)).toEqual(['foo']);
      });

      it('should trigger changed signal', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        let called = false;
        model.metadataChanged.connect(() => {
          called = true;
        });
        model.setMetadata('foo', 1);
        expect(called).toBe(true);
      });
    });
  });

  describe('RawCellModel', () => {
    describe('#type', () => {
      it('should be set with type "raw"', () => {
        const model = new RawCellModel();
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
        const model = new RawCellModel({
          sharedModel: createStandaloneCell(cell) as YRawCell
        });
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
      });
    });
  });

  describe('MarkdownCellModel', () => {
    describe('#type', () => {
      it('should be set with type "markdown"', () => {
        const model = new MarkdownCellModel();
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
        const model = new MarkdownCellModel({
          sharedModel: createStandaloneCell(cell) as YMarkdownCell
        });
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
      });
    });
  });

  describe('CodeCellModel', () => {
    describe('#constructor()', () => {
      it('should create a code cell model', () => {
        const model = new CodeCellModel();
        expect(model).toBeInstanceOf(CodeCellModel);
      });

      it('should accept a code cell argument', () => {
        const sharedModel = createStandaloneCell({
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
        }) as YCodeCell;
        const model = new CodeCellModel({ sharedModel });
        expect(model).toBeInstanceOf(CodeCellModel);
        expect(model.sharedModel.getSource()).toBe('foo');
      });

      it('should connect the outputs changes to content change signal', () => {
        const data = {
          output_type: 'display_data',
          data: { 'text/plain': 'foo' },
          metadata: {}
        } as nbformat.IDisplayData;
        const model = new CodeCellModel();
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
          sharedModel: createStandaloneCell({
            cell_type: 'code',
            source: '',
            metadata: { collapsed: true }
          }) as YCodeCell
        });
        expect(model.getMetadata('collapsed')).toBe(true);
        jupyter = model.getMetadata('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // Setting `jupyter.outputs_hidden` works
        model = new CodeCellModel({
          sharedModel: createStandaloneCell({
            cell_type: 'code',
            source: '',
            metadata: { jupyter: { outputs_hidden: true } }
          }) as YCodeCell
        });
        expect(model.getMetadata('collapsed')).toBe(true);
        jupyter = model.getMetadata('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(true);

        // `collapsed` takes precedence
        model = new CodeCellModel({
          sharedModel: createStandaloneCell({
            cell_type: 'code',
            source: '',
            metadata: { collapsed: false, jupyter: { outputs_hidden: true } }
          }) as YCodeCell
        });
        expect(model.getMetadata('collapsed')).toBe(false);
        jupyter = model.getMetadata('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).toBe(false);
      });
    });

    describe('#type', () => {
      it('should be set with type "code"', () => {
        const model = new CodeCellModel();
        expect(model.type).toBe('code');
      });
    });

    describe('#executionCount', () => {
      it('should show the execution count of the cell', () => {
        const sharedModel = createStandaloneCell({
          cell_type: 'code',
          execution_count: 1,
          outputs: [],
          source: 'foo',
          metadata: { trusted: false }
        }) as YCodeCell;
        const model = new CodeCellModel({ sharedModel });
        expect(model.executionCount).toBe(1);
      });

      it('should be settable', () => {
        const model = new CodeCellModel();
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
      });

      it('should emit a state change signal when set', () => {
        const model = new CodeCellModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        expect(called).toBe(false);
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
        expect(called).toBe(true);
      });

      it('should not signal when state has not changed', () => {
        const model = new CodeCellModel();
        let called = 0;
        model.sharedModel.changed.connect((model, args) => {
          if (args.executionCountChange) {
            called++;
          }
        });
        expect(called).toBe(0);
        model.executionCount = 1;
        expect(model.executionCount).toBe(1);
        model.executionCount = 1;
        expect(called).toBe(1);
      });

      it('should set dirty flag and signal', () => {
        const model = new CodeCellModel();
        let called = 0;
        model.stateChanged.connect((model, args) => {
          if (args.name == 'isDirty') {
            called++;
          }
        });
        expect(model.executionCount).toBe(null);
        expect(model.isDirty).toBe(false);
        expect(called).toBe(0);

        model.executionCount = 1;
        expect(model.isDirty).toBe(false);
        expect(called).toBe(0);

        model.sharedModel.setSource('foo');
        expect(model.isDirty).toBe(true);
        expect(called).toBe(1);

        model.executionCount = 2;
        expect(model.isDirty).toBe(false);
        expect(called).toBe(2);
      });
    });

    describe('#outputs', () => {
      it('should be an output area model', () => {
        const model = new CodeCellModel();
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new CodeCellModel();
        expect(model.outputs).toBeInstanceOf(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).toBe(true);
        expect(model.outputs).toBeNull();
      });

      it('should be safe to call multiple times', () => {
        const model = new CodeCellModel();
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
          metadata: { trusted: false },
          id: 'cell_id'
        };
        const model = new CodeCellModel({
          sharedModel: createStandaloneCell(cell) as ISharedCodeCell
        });
        const serialized = model.toJSON();
        expect(serialized).not.toBe(cell);
        expect(serialized).toEqual(cell);
        const output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).toBe(1);
      });
    });

    describe('#onOutputsChange()', () => {
      const output0 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'foo',
          'application/json': { foo: 1 }
        },
        metadata: {}
      } as nbformat.IDisplayData;
      const output1 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'bar',
          'application/json': { bar: 2 }
        },
        metadata: {}
      } as nbformat.IDisplayData;
      const output2 = {
        output_type: 'display_data',
        data: {
          'text/plain': 'foobar',
          'application/json': { foobar: 2 }
        },
        metadata: {}
      } as nbformat.IDisplayData;
      const cell: nbformat.ICodeCell = {
        cell_type: 'code',
        execution_count: 1,
        outputs: [output0, output1],
        source: 'foo',
        metadata: { trusted: false },
        id: 'cell_id'
      };
      it('should add new items correctly', () => {
        const model = new CodeCellModel();
        const sharedModel = model.sharedModel as YCodeCell;
        expect(sharedModel.ymodel.get('outputs').length).toBe(0);

        const newEvent0 = {
          type: 'add',
          newValues: [{ toJSON: () => output0 }],
          oldValues: [],
          oldIndex: -1,
          newIndex: 0
        } as any;
        model['onOutputsChange'](null as any, newEvent0);
        expect(sharedModel.ymodel.get('outputs').length).toBe(1);
        expect(sharedModel.ymodel.get('outputs').get(0).toJSON()).toEqual(
          output0
        );

        const newEvent1 = {
          type: 'add',
          newValues: [{ toJSON: () => output1 }],
          oldValues: [],
          oldIndex: -1,
          newIndex: 1
        } as any;
        model['onOutputsChange'](null as any, newEvent1);
        expect(sharedModel.ymodel.get('outputs').length).toBe(2);
        expect(sharedModel.ymodel.get('outputs').get(1).toJSON()).toEqual(
          output1
        );
      });

      it('should set new items correctly', () => {
        const model = new CodeCellModel({
          sharedModel: createStandaloneCell(cell) as ISharedCodeCell
        });
        const sharedModel = model.sharedModel as YCodeCell;
        expect(sharedModel.ymodel.get('outputs').length).toBe(2);

        const newEvent0 = {
          type: 'set',
          newValues: [{ toJSON: () => output2 }],
          oldValues: [output0],
          oldIndex: 0,
          newIndex: 0
        } as any;
        model['onOutputsChange'](null as any, newEvent0);
        expect(sharedModel.ymodel.get('outputs').length).toBe(2);
        expect(sharedModel.ymodel.get('outputs').get(0).toJSON()).toEqual(
          output2
        );
        const newEvent1 = {
          type: 'set',
          newValues: [{ toJSON: () => output2 }],
          oldValues: [output1],
          oldIndex: 1,
          newIndex: 1
        } as any;
        model['onOutputsChange'](null as any, newEvent1);
        expect(sharedModel.ymodel.get('outputs').length).toBe(2);
        expect(sharedModel.ymodel.get('outputs').get(1).toJSON()).toEqual(
          output2
        );
      });

      it('should remove items correctly', () => {
        const model = new CodeCellModel({
          sharedModel: createStandaloneCell(cell) as ISharedCodeCell
        });
        const sharedModel = model.sharedModel as YCodeCell;
        expect(sharedModel.getOutputs().length).toBe(2);
        const newEvent0 = {
          type: 'remove',
          newValues: [],
          oldValues: [output0, output1],
          oldIndex: 0,
          newIndex: 0
        } as any;
        model['onOutputsChange'](null as any, newEvent0);
        expect(sharedModel.ymodel.get('outputs').length).toBe(0);
      });
    });

    describe('.metadata', () => {
      it('should sync collapsed and jupyter.outputs_hidden metadata when changed', () => {
        const cell = new CodeCellModel();

        expect(cell.getMetadata('collapsed')).toBeUndefined();
        expect(cell.getMetadata('jupyter')).toBeUndefined();

        // Setting collapsed sets jupyter.outputs_hidden
        cell.setMetadata('collapsed', true);
        expect(cell.getMetadata('collapsed')).toBe(true);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: true
        });

        cell.setMetadata('collapsed', false);
        expect(cell.getMetadata('collapsed')).toBe(false);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: false
        });

        cell.deleteMetadata('collapsed');
        expect(cell.getMetadata('collapsed')).toBeUndefined();
        expect(cell.getMetadata('jupyter')).toBeUndefined();

        // Setting jupyter.outputs_hidden sets collapsed
        cell.setMetadata('jupyter', { outputs_hidden: true });
        expect(cell.getMetadata('collapsed')).toBe(true);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: true
        });

        cell.setMetadata('jupyter', { outputs_hidden: false });
        expect(cell.getMetadata('collapsed')).toBe(false);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: false
        });

        cell.deleteMetadata('jupyter');
        expect(cell.getMetadata('collapsed')).toBeUndefined();
        expect(cell.getMetadata('jupyter')).toBeUndefined();

        // Deleting jupyter.outputs_hidden preserves other jupyter fields
        cell.setMetadata('jupyter', { outputs_hidden: true, other: true });
        expect(cell.getMetadata('collapsed')).toBe(true);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: true,
          other: true
        });
        cell.setMetadata('jupyter', { other: true });
        expect(cell.getMetadata('collapsed')).toBeUndefined();
        expect(cell.getMetadata('jupyter')).toEqual({
          other: true
        });

        // Deleting collapsed preserves other jupyter fields
        cell.setMetadata('jupyter', { outputs_hidden: true, other: true });
        expect(cell.getMetadata('collapsed')).toBe(true);
        expect(cell.getMetadata('jupyter')).toEqual({
          outputs_hidden: true,
          other: true
        });
        cell.deleteMetadata('collapsed');
        expect(cell.getMetadata('collapsed')).toBeUndefined();
        expect(cell.getMetadata('jupyter')).toEqual({
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
