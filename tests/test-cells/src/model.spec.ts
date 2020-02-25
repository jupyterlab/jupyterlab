// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

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
        expect(model).to.be.an.instanceof(CellModel);
      });

      it('should accept a base cell argument', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        const model = new CellModel({ cell });
        expect(model).to.be.an.instanceof(CellModel);
        expect(model.value.text).to.equal(cell.source);
      });

      it('should accept a base cell argument with a multiline source', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = new CellModel({ cell });
        expect(model).to.be.an.instanceof(CellModel);
        expect(model.value.text).to.equal((cell.source as string[]).join(''));
      });
    });

    describe('#contentChanged', () => {
      it('should signal when model content has changed', () => {
        const model = new CellModel({});
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        expect(called).to.equal(false);
        model.value.text = 'foo';
        expect(called).to.equal(true);
      });
    });

    describe('#stateChanged', () => {
      it('should signal when model state has changed', () => {
        const model = new CodeCellModel({});
        let called = false;
        const listener = (sender: any, args: IChangedArgs<any>) => {
          expect(args.newValue).to.equal(1);
          called = true;
        };
        model.stateChanged.connect(listener);
        model.executionCount = 1;
        expect(called).to.equal(true);
      });

      it('should not signal when model state has not changed', () => {
        const model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => {
          called++;
        });
        expect(called).to.equal(0);
        model.executionCount = 1;
        expect(called).to.equal(1);
        model.executionCount = 1;
        expect(called).to.equal(1);
      });
    });

    describe('#trusted', () => {
      it('should be the trusted state of the cell', () => {
        const model = new CodeCellModel({});
        expect(model.trusted).to.equal(false);
        model.trusted = true;
        expect(model.trusted).to.equal(true);
        const other = new CodeCellModel({ cell: model.toJSON() });
        expect(other.trusted).to.equal(true);
      });

      it('should update the trusted state of the output models', () => {
        const model = new CodeCellModel({});
        model.outputs.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.outputs.get(0).trusted).to.equal(false);
        model.trusted = true;
        expect(model.outputs.get(0).trusted).to.equal(true);
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
        expect(value).to.be.empty;
        model.metadata.set('foo', 'bar');
        expect(value).to.equal('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        const model = new TestModel({});
        let called = 0;
        model.metadata.changed.connect(() => {
          called++;
        });
        expect(called).to.equal(0);
        model.metadata.set('foo', 'bar');
        expect(called).to.equal(1);
        model.metadata.set('foo', 'bar');
        expect(called).to.equal(1);
      });
    });

    describe('#source', () => {
      it('should default to an empty string', () => {
        const model = new CellModel({});
        expect(model.value.text).to.be.empty;
      });

      it('should be settable', () => {
        const model = new CellModel({});
        expect(model.value.text).to.be.empty;
        model.value.text = 'foo';
        expect(model.value.text).to.equal('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should be false by default', () => {
        const model = new CellModel({});
        expect(model.isDisposed).to.equal(false);
      });

      it('should be true after model is disposed', () => {
        const model = new CellModel({});
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new TestModel({});
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new CellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.equal(true);
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
        expect(model.toJSON()).to.not.equal(cell);
        expect(model.toJSON()).to.deep.equal(cell);
      });

      it('should always return a string source', () => {
        const cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo\n', 'bar\n', 'baz'],
          metadata: { trusted: false }
        };
        const model = new TestModel({ cell });
        cell.source = (cell.source as string[]).join('');
        expect(model.toJSON()).to.not.equal(cell);
        expect(model.toJSON()).to.deep.equal(cell);
      });
    });

    describe('#metadata', () => {
      it('should handle a metadata for the cell', () => {
        const model = new CellModel({});
        expect(model.metadata.get('foo')).to.be.undefined;
        model.metadata.set('foo', 1);
        expect(model.metadata.get('foo')).to.equal(1);
      });

      it('should get a list of user metadata keys', () => {
        const model = new CellModel({});
        expect(toArray(model.metadata.keys())).to.be.empty;
        model.metadata.set('foo', 1);
        expect(model.metadata.keys()).to.deep.equal(['foo']);
      });

      it('should trigger changed signal', () => {
        const model = new CellModel({});
        let called = false;
        model.metadata.changed.connect(() => {
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).to.equal(true);
      });
    });
  });

  describe('RawCellModel', () => {
    describe('#type', () => {
      it('should be set with type "raw"', () => {
        const model = new RawCellModel({});
        expect(model.type).to.equal('raw');
      });
    });
  });

  describe('MarkdownCellModel', () => {
    describe('#type', () => {
      it('should be set with type "markdown"', () => {
        const model = new MarkdownCellModel({});
        expect(model.type).to.equal('markdown');
      });
    });
  });

  describe('CodeCellModel', () => {
    describe('#constructor()', () => {
      it('should create a code cell model', () => {
        const model = new CodeCellModel({});
        expect(model).to.be.an.instanceof(CodeCellModel);
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
        expect(model).to.be.an.instanceof(CodeCellModel);
        expect(model.value.text).to.equal(cell.source);
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
        expect(called).to.equal(false);
        model.outputs.add(data);
        expect(called).to.equal(true);
      });

      it('should sync collapsed and jupyter.outputs_hidden metadata on construction', () => {
        let model: CodeCellModel;
        let jupyter: JSONObject | undefined;

        // Setting `collapsed` works
        model = new CodeCellModel({
          cell: { cell_type: 'code', source: '', metadata: { collapsed: true } }
        });
        expect(model.metadata.get('collapsed')).to.be.true;
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).to.be.true;

        // Setting `jupyter.outputs_hidden` works
        model = new CodeCellModel({
          cell: {
            cell_type: 'code',
            source: '',
            metadata: { jupyter: { outputs_hidden: true } }
          }
        });
        expect(model.metadata.get('collapsed')).to.be.true;
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).to.be.true;

        // `collapsed` takes precedence
        model = new CodeCellModel({
          cell: {
            cell_type: 'code',
            source: '',
            metadata: { collapsed: false, jupyter: { outputs_hidden: true } }
          }
        });
        expect(model.metadata.get('collapsed')).to.be.false;
        jupyter = model.metadata.get('jupyter') as JSONObject;
        expect(jupyter.outputs_hidden).to.be.false;
      });
    });

    describe('#type', () => {
      it('should be set with type "code"', () => {
        const model = new CodeCellModel({});
        expect(model.type).to.equal('code');
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
        expect(model.executionCount).to.equal(1);
      });

      it('should be settable', () => {
        const model = new CodeCellModel({});
        expect(model.executionCount).to.be.null;
        model.executionCount = 1;
        expect(model.executionCount).to.equal(1);
      });

      it('should emit a state change signal when set', () => {
        const model = new CodeCellModel({});
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        expect(model.executionCount).to.be.null;
        expect(called).to.equal(false);
        model.executionCount = 1;
        expect(model.executionCount).to.equal(1);
        expect(called).to.equal(true);
      });

      it('should not signal when state has not changed', () => {
        const model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => {
          called++;
        });
        expect(model.executionCount).to.be.null;
        expect(called).to.equal(0);
        model.executionCount = 1;
        expect(model.executionCount).to.equal(1);
        model.executionCount = 1;
        expect(called).to.equal(1);
      });
    });

    describe('#outputs', () => {
      it('should be an output area model', () => {
        const model = new CodeCellModel({});
        expect(model.outputs).to.be.an.instanceof(OutputAreaModel);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        const model = new CodeCellModel({});
        expect(model.outputs).to.be.an.instanceof(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).to.equal(true);
        expect(model.outputs).to.be.null;
      });

      it('should be safe to call multiple times', () => {
        const model = new CodeCellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.equal(true);
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
        expect(serialized).to.not.equal(cell);
        expect(serialized).to.deep.equal(cell);
        const output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).to.equal(1);
      });
    });

    describe('.metadata', () => {
      it('should sync collapsed and jupyter.outputs_hidden metadata when changed', () => {
        const metadata = new CodeCellModel({}).metadata;

        expect(metadata.get('collapsed')).to.be.undefined;
        expect(metadata.get('jupyter')).to.be.undefined;

        // Setting collapsed sets jupyter.outputs_hidden
        metadata.set('collapsed', true);
        expect(metadata.get('collapsed')).to.be.true;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: true
        });

        metadata.set('collapsed', false);
        expect(metadata.get('collapsed')).to.be.false;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: false
        });

        metadata.delete('collapsed');
        expect(metadata.get('collapsed')).to.be.undefined;
        expect(metadata.get('jupyter')).to.be.undefined;

        // Setting jupyter.outputs_hidden sets collapsed
        metadata.set('jupyter', { outputs_hidden: true });
        expect(metadata.get('collapsed')).to.be.true;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: true
        });

        metadata.set('jupyter', { outputs_hidden: false });
        expect(metadata.get('collapsed')).to.be.false;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: false
        });

        metadata.delete('jupyter');
        expect(metadata.get('collapsed')).to.be.undefined;
        expect(metadata.get('jupyter')).to.be.undefined;

        // Deleting jupyter.outputs_hidden preserves other jupyter fields
        metadata.set('jupyter', { outputs_hidden: true, other: true });
        expect(metadata.get('collapsed')).to.be.true;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: true,
          other: true
        });
        metadata.set('jupyter', { other: true });
        expect(metadata.get('collapsed')).to.be.undefined;
        expect(metadata.get('jupyter')).to.deep.equal({
          other: true
        });

        // Deleting collapsed preserves other jupyter fields
        metadata.set('jupyter', { outputs_hidden: true, other: true });
        expect(metadata.get('collapsed')).to.be.true;
        expect(metadata.get('jupyter')).to.deep.equal({
          outputs_hidden: true,
          other: true
        });
        metadata.delete('collapsed');
        expect(metadata.get('collapsed')).to.be.undefined;
        expect(metadata.get('jupyter')).to.deep.equal({
          other: true
        });
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor()', () => {
        it('should create a new output area factory', () => {
          const factory = new CodeCellModel.ContentFactory();
          expect(factory).to.be.an.instanceof(CodeCellModel.ContentFactory);
        });
      });

      describe('#createOutputArea()', () => {
        it('should create an output area model', () => {
          const factory = new CodeCellModel.ContentFactory();
          expect(
            factory.createOutputArea({ trusted: true })
          ).to.be.an.instanceof(OutputAreaModel);
        });
      });
    });

    describe('.defaultContentFactory', () => {
      it('should be an ContentFactory', () => {
        expect(CodeCellModel.defaultContentFactory).to.be.an.instanceof(
          CodeCellModel.ContentFactory
        );
      });
    });
  });
});
