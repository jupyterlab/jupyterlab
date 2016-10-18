// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  IChangedArgs
} from '../../../../lib/common/interfaces';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  CellModel, RawCellModel, MarkdownCellModel, CodeCellModel
} from '../../../../lib/notebook/cells';

import {
  OutputAreaModel
} from '../../../../lib/notebook/output-area';


class TestModel extends CellModel {
  get type(): 'raw' { return 'raw'; }

  setCursorData(name: string, newValue: any): void {
    super.setCursorData(name, newValue);
  }
}


describe('notebook/cells/model', () => {

  describe('CellModel', () => {

    describe('#constructor()', () => {

      it('should create a cell model', () => {
        let model = new CellModel();
        expect(model).to.be.a(CellModel);
      });

      it('should accept a base cell argument', () => {
        let base: nbformat.IBaseCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new CellModel(base);
        expect(model).to.be.a(CellModel);
        expect(model.source).to.equal(base.source);
      });

      it('should accept a base cell argument with a multiline source', () => {
        let base: nbformat.IBaseCell = {
          cell_type: 'raw',
          source: ['foo', 'bar', 'baz'],
          metadata: { trusted: false }
        };
        let model = new CellModel(base);
        expect(model).to.be.a(CellModel);
        expect(model.source).to.equal((base.source as string[]).join('\n'));
      });

    });

    describe('#contentChanged', () => {

      it('should signal when model content has changed', () => {
        let model = new CellModel();
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        expect(called).to.be(false);
        model.source = 'foo';
        expect(called).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should signal when model state has changed', () => {
        let model = new CellModel();
        let listener = (sender: any, args: IChangedArgs<any>) => {
          value = args.newValue;
        };
        let value = '';
        model.stateChanged.connect(listener);
        expect(value).to.be.empty();
        model.source = 'foo';
        expect(value).to.be(model.source);
      });

      it('should not signal when model state has not changed', () => {
        let model = new CellModel();
        let called = 0;
        model.stateChanged.connect(() => { called++; });
        expect(called).to.be(0);
        model.source = 'foo';
        expect(called).to.be(1);
        model.source = 'foo';
        expect(called).to.be(1);
      });

    });

    describe('#metadataChanged', () => {

      it('should signal when model metadata has changed', () => {
        let model = new TestModel();
        let listener = (sender: any, args: IChangedArgs<any>) => {
          value = args.newValue;
        };
        let value = '';
        model.metadataChanged.connect(listener);
        expect(value).to.be.empty();
        model.setCursorData('foo', 'bar');
        expect(value).to.be('bar');
      });

      it('should not signal when model metadata has not changed', () => {
        let model = new TestModel();
        let called = 0;
        model.metadataChanged.connect(() => { called++; });
        expect(called).to.be(0);
        model.setCursorData('foo', 'bar');
        expect(called).to.be(1);
        model.setCursorData('foo', 'bar');
        expect(called).to.be(1);
      });

    });

    describe('#source', () => {

      it('should default to an empty string', () => {
        let model = new CellModel();
        expect(model.source).to.be.empty();
      });

      it('should be settable', () => {
        let model = new CellModel();
        expect(model.source).to.be.empty();
        model.source = 'foo';
        expect(model.source).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should be false by default', () => {
        let model = new CellModel();
        expect(model.isDisposed).to.be(false);
      });

      it('should be true after model is disposed', () => {
        let model = new CellModel();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new TestModel();

        model.setCursorData('foo', 'bar');
        expect(model.getMetadata('foo').getValue()).to.be('bar');
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.getMetadata('foo')).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let model = new CellModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#toJSON()', () => {

      it('should return a base cell encapsulation of the model value', () => {
        let base: nbformat.IBaseCell = {
          cell_type: 'raw',
          source: 'foo',
          metadata: { trusted: false }
        };
        let model = new TestModel(base);
        expect(model.toJSON()).to.not.equal(base);
        expect(model.toJSON()).to.eql(base);
      });

      it('should always return a string source', () => {
        let base: nbformat.IBaseCell = {
          cell_type: 'raw',
          source: ['foo', 'bar', 'baz'],
          metadata: { trusted: false }
        };
        let model = new TestModel(base);
        base.source = (base.source as string[]).join('\n');
        expect(model.toJSON()).to.not.equal(base);
        expect(model.toJSON()).to.eql(base);
      });

    });

    describe('#getMetadata()', () => {

      it('should get a metadata cursor for the cell', () => {
        let model = new CellModel();
        let c1 = model.getMetadata('foo');

        expect(c1.getValue()).to.be(void 0);
        c1.setValue(1);
        expect(c1.getValue()).to.be(1);

        let c2 = model.getMetadata('foo');

        expect(c2.getValue()).to.be(1);
        c2.setValue(2);
        expect(c1.getValue()).to.be(2);
        expect(c2.getValue()).to.be(2);
      });

    });

    describe('#listMetadata()', () => {

      it('should get a list of user metadata keys', () => {
        let model = new CellModel();
        let cursor = model.getMetadata('foo');
        expect(toArray(model.listMetadata())).to.be.empty();
        cursor.setValue(1);
        expect(toArray(model.listMetadata())).to.eql(['foo']);
      });

    });

  });

  describe('RawCellModel', () => {

    describe('#type', () => {

      it('should be set with type "raw"', () => {
        let model = new RawCellModel();
        expect(model.type).to.be('raw');
      });

    });

  });

  describe('MarkdownCellModel', () => {

    describe('#type', () => {

      it('should be set with type "markdown"', () => {
        let model = new MarkdownCellModel();
        expect(model.type).to.be('markdown');
      });

    });

  });

  describe('CodeCellModel', () => {

    describe('#constructor()', () => {

      it('should create a code cell model', () => {
        let model = new CodeCellModel();
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
        let model = new CodeCellModel(cell);
        expect(model).to.be.a(CodeCellModel);
        expect(model.source).to.equal(cell.source);
      });

      it('should connect the outputs changes to content change signal', () => {
        let data = {
          output_type: 'display_data',
          data: { 'text/plain': 'foo' },
          metadata: {}
        } as nbformat.IDisplayData;
        let model = new CodeCellModel();
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        expect(called).to.be(false);
        model.outputs.add(data);
        expect(called).to.be(true);
      });

    });

    describe('#type', () => {

      it('should be set with type "code"', () => {
        let model = new CodeCellModel();
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
        let model = new CodeCellModel(cell);
        expect(model.executionCount).to.be(1);
      });

      it('should be settable', () => {
        let model = new CodeCellModel();
        expect(model.executionCount).to.be(null);
        model.executionCount = 1;
        expect(model.executionCount).to.be(1);
      });

      it('should emit a state change signal when set', () => {
        let model = new CodeCellModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        expect(model.executionCount).to.be(null);
        expect(called).to.be(false);
        model.executionCount = 1;
        expect(model.executionCount).to.be(1);
        expect(called).to.be(true);
      });

      it('should not signal when state has not changed', () => {
        let model = new CodeCellModel();
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
        let model = new CodeCellModel();
        expect(model.outputs).to.be.an(OutputAreaModel);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new CodeCellModel();
        expect(model.outputs).to.be.an(OutputAreaModel);
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.outputs).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let model = new CodeCellModel();
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
        let model = new CodeCellModel(cell);
        let serialized = model.toJSON();
        expect(serialized).to.not.equal(cell);
        expect(serialized).to.eql(cell);
        let output = serialized.outputs[0] as any;
        expect(output.data['application/json']['bar']).to.be(1);
      });

    });

  });

});
