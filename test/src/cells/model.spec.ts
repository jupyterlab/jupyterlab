// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  IChangedArgs, nbformat
} from '@jupyterlab/coreutils';

import {
  CellModel, RawCellModel, MarkdownCellModel, CodeCellModel
} from '@jupyterlab/cells';

import {
  OutputAreaModel
} from '@jupyterlab/outputarea';

import {
  DEFAULT_OUTPUTS
} from '../utils';


class TestModel extends CellModel {
  get type(): 'raw' { return 'raw'; }
}


describe('cells/model', () => {

  describe('CellModel', () => {

    describe('#constructor()', () => {

      it('should create a cell model', () => {
        let model = new CellModel({});
        expect(model).to.be.a(CellModel);
      });

      it('should accept a base cell argument', () => {
        let cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new CellModel({ cell });
        expect(model).to.be.a(CellModel);
        expect(model.value.text).to.equal(cell.source);
      });

      it('should accept a base cell argument with a multiline source', () => {
        let cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo', 'bar', 'baz'],
          metadata: { trusted: false }
        };
        let model = new CellModel({ cell });
        expect(model).to.be.a(CellModel);
        expect(model.value.text).to.equal((cell.source as string[]).join('\n'));
      });

    });

    describe('#contentChanged', () => {

      it('should signal when model content has changed', () => {
        let model = new CellModel({});
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        expect(called).to.be(false);
        model.value.text = 'foo';
        expect(called).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should signal when model state has changed', () => {
        let model = new CodeCellModel({});
        let called = false;
        let listener = (sender: any, args: IChangedArgs<any>) => {
          expect(args.newValue).to.be(1);
          called = true;
        };
        model.stateChanged.connect(listener);
        model.executionCount = 1;
        expect(called).to.be(true);
      });

      it('should not signal when model state has not changed', () => {
        let model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => { called++; });
        expect(called).to.be(0);
        model.executionCount = 1;
        expect(called).to.be(1);
        model.executionCount = 1;
        expect(called).to.be(1);
      });

    });

    describe('#trusted', () => {

      it('should be the trusted state of the cell', () => {
        let model = new CodeCellModel({});
        expect(model.trusted).to.be(false);
        model.trusted = true;
        expect(model.trusted).to.be(true);
        let other = new CodeCellModel({ cell: model.toJSON() });
        expect(other.trusted).to.be(true);
      });

      it('should update the trusted state of the output models', () => {
        let model = new CodeCellModel({});
        model.outputs.add(DEFAULT_OUTPUTS[0]);
        expect(model.outputs.get(0).trusted).to.be(false);
        model.trusted = true;
        expect(model.outputs.get(0).trusted).to.be(true);
      });

    });

    describe('#metadataChanged', () => {

      it('should signal when model metadata has changed', () => {
        let model = new TestModel({});
        let listener = (sender: any, args: any) => {
          value = args.newValue;
        };
        let value = '';
        model.metadata.changed.connect(listener);
        expect(value).to.be.empty();
        model.metadata.set('foo', 'bar');
        expect(value).to.be('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        let model = new TestModel({});
        let called = 0;
        model.metadata.changed.connect(() => { called++; });
        expect(called).to.be(0);
        model.metadata.set('foo', 'bar');
        expect(called).to.be(1);
        model.metadata.set('foo', 'bar');
        expect(called).to.be(1);
      });

    });

    describe('#source', () => {

      it('should default to an empty string', () => {
        let model = new CellModel({});
        expect(model.value.text).to.be.empty();
      });

      it('should be settable', () => {
        let model = new CellModel({});
        expect(model.value.text).to.be.empty();
        model.value.text = 'foo';
        expect(model.value.text).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should be false by default', () => {
        let model = new CellModel({});
        expect(model.isDisposed).to.be(false);
      });

      it('should be true after model is disposed', () => {
        let model = new CellModel({});
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new TestModel({});
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let model = new CellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#toJSON()', () => {

      it('should return a base cell encapsulation of the model value', () => {
        let cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new TestModel({ cell });
        expect(model.toJSON()).to.not.equal(cell);
        expect(model.toJSON()).to.eql(cell);
      });

      it('should always return a string source', () => {
        let cell: nbformat.IRawCell = {
          cell_type: 'raw',
          source: ['foo', 'bar', 'baz'],
          metadata: { trusted: false }
        };
        let model = new TestModel({ cell });
        cell.source = (cell.source as string[]).join('\n');
        expect(model.toJSON()).to.not.equal(cell);
        expect(model.toJSON()).to.eql(cell);
      });

    });

    describe('#metadata', () => {

      it('should handle a metadata for the cell', () => {
        let model = new CellModel({});
        expect(model.metadata.get('foo')).to.be(void 0);
        model.metadata.set('foo', 1);
        expect(model.metadata.get('foo')).to.be(1);
      });

      it('should get a list of user metadata keys', () => {
        let model = new CellModel({});
        expect(toArray(model.metadata.keys())).to.be.empty();
        model.metadata.set('foo', 1);
        expect(model.metadata.keys()).to.eql(['foo']);
      });

      it('should trigger changed signal', () => {
        let model = new CellModel({});
        let called = false;
        model.metadata.changed.connect(() => { called = true; });
        model.metadata.set('foo', 1);
        expect(called).to.be(true);
      });

    });

  });

  describe('RawCellModel', () => {

    describe('#type', () => {

      it('should be set with type "raw"', () => {
        let model = new RawCellModel({});
        expect(model.type).to.be('raw');
      });

    });

  });

  describe('MarkdownCellModel', () => {

    describe('#type', () => {

      it('should be set with type "markdown"', () => {
        let model = new MarkdownCellModel({});
        expect(model.type).to.be('markdown');
      });

    });

  });

  describe('CodeCellModel', () => {

    describe('#constructor()', () => {

      it('should create a code cell model', () => {
        let model = new CodeCellModel({});
        expect(model).to.be.a(CodeCellModel);
      });

      it('should accept a code cell argument', () => {
        let cell: nbformat.ICodeCell = {
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
        let model = new CodeCellModel({ cell });
        expect(model).to.be.a(CodeCellModel);
        expect(model.value.text).to.equal(cell.source);
      });

      it('should connect the outputs changes to content change signal', () => {
        let data = {
          output_type: 'display_data',
          data: { 'text/plain': 'foo' },
          metadata: {}
        } as nbformat.IDisplayData;
        let model = new CodeCellModel({});
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        expect(called).to.be(false);
        model.outputs.add(data);
        expect(called).to.be(true);
      });

    });

    describe('#type', () => {

      it('should be set with type "code"', () => {
        let model = new CodeCellModel({});
        expect(model.type).to.be('code');
      });

    });

    describe('#executionCount', () => {

      it('should show the execution count of the cell', () => {
        let cell: nbformat.ICodeCell = {
          cell_type: 'code',
          execution_count: 1,
          outputs: [],
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new CodeCellModel({ cell });
        expect(model.executionCount).to.be(1);
      });

      it('should be settable', () => {
        let model = new CodeCellModel({});
        expect(model.executionCount).to.be(null);
        model.executionCount = 1;
        expect(model.executionCount).to.be(1);
      });

      it('should emit a state change signal when set', () => {
        let model = new CodeCellModel({});
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        expect(model.executionCount).to.be(null);
        expect(called).to.be(false);
        model.executionCount = 1;
        expect(model.executionCount).to.be(1);
        expect(called).to.be(true);
      });

      it('should not signal when state has not changed', () => {
        let model = new CodeCellModel({});
        let called = 0;
        model.stateChanged.connect(() => { called++; });
        expect(model.executionCount).to.be(null);
        expect(called).to.be(0);
        model.executionCount = 1;
        expect(model.executionCount).to.be(1);
        model.executionCount = 1;
        expect(called).to.be(1);
      });

    });

    describe('#outputs', () => {

      it('should be an output area model', () => {
        let model = new CodeCellModel({});
        expect(model.outputs).to.be.an(OutputAreaModel);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new CodeCellModel({});
        expect(model.outputs).to.be.an(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.outputs).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let model = new CodeCellModel({});
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#toJSON()', () => {

      it('should return a code cell encapsulation of the model value', () => {
        let cell: nbformat.ICodeCell = {
          cell_type: 'code',
          execution_count: 1,
          outputs: [
            {
              output_type: 'display_data',
              data: {
                'text/plain': 'foo',
                'application/json': { 'bar': 1 }
              },
              metadata: {}
            } as nbformat.IDisplayData
          ],
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new CodeCellModel({ cell });
        let serialized = model.toJSON();
        expect(serialized).to.not.equal(cell);
        expect(serialized).to.eql(cell);
        let output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).to.be(1);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor()', () => {

        it('should create a new output area factory', () => {
          let factory = new CodeCellModel.ContentFactory();
          expect(factory).to.be.a(CodeCellModel.ContentFactory);
        });

      });

      describe('#createOutputArea()', () => {

        it('should create an output area model', () => {
          let factory = new CodeCellModel.ContentFactory();
          expect(factory.createOutputArea({ trusted: true })).to.be.an(OutputAreaModel);
        });

      });

    });

    describe('.defaultContentFactory', () => {

      it('should be an ContentFactory', () => {
        expect(CodeCellModel.defaultContentFactory).to.be.a(CodeCellModel.ContentFactory);
      });

    });

  });

});
