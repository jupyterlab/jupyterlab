// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { OutputModel } from '@jupyterlab/rendermime';

const DEFAULT_EXECUTE: nbformat.IOutput = {
  output_type: 'execute_result',
  execution_count: 1,
  data: { 'text/plain': 'foo' },
  metadata: {
    foo: 1,
    bar: 'baz'
  }
};

const DEFAULT_STREAM: nbformat.IOutput = {
  name: 'stderr',
  output_type: 'stream',
  text: ['output to stderr\n']
};

describe('rendermime/outputmodel', () => {
  describe('OutputModel', () => {
    describe('#constructor()', () => {
      it('should create a new output model', () => {
        const value = DEFAULT_EXECUTE;
        let model = new OutputModel({ value });
        expect(model).toBeInstanceOf(OutputModel);
        model = new OutputModel({ value, trusted: true });
        expect(model).toBeInstanceOf(OutputModel);
      });
    });

    describe('#changed', () => {
      it('should be emitted when the data changes', () => {
        const value = DEFAULT_EXECUTE;
        let model = new OutputModel({ value });
        let called = false;
        model.changed.connect((sender, args) => {
          expect(sender).toBe(model);
          called = true;
        });
        model.setData({ ...model.data });
        expect(called).toBe(true);
      });
    });

    describe('#type', () => {
      it('should be the output type', () => {
        let model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.type).toBe(DEFAULT_EXECUTE.output_type);
        model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.type).toBe(DEFAULT_STREAM.output_type);
      });
    });

    describe('#executionCount', () => {
      it('should be the execution count of an execution result', () => {
        const model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.executionCount).toBe(1);
      });

      it('should be null for non-execution results', () => {
        const model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.executionCount).toBeNull();
      });
    });

    describe('#toJSON()', () => {
      it('should yield the raw value', () => {
        const model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.toJSON()).toEqual(DEFAULT_EXECUTE);
      });
    });

    describe('.getData()', () => {
      it('should handle all bundle types', () => {
        for (let i = 0; i < NBTestUtils.DEFAULT_OUTPUTS.length; i++) {
          const output = NBTestUtils.DEFAULT_OUTPUTS[i];
          const bundle = OutputModel.getData(output);
          expect(Object.keys(bundle).length).not.toBe(0);
        }
      });
    });

    describe('.getMetadata()', () => {
      it('should get the metadata from the bundle', () => {
        const metadata = OutputModel.getMetadata(DEFAULT_EXECUTE);
        expect(metadata['foo']).toBe(1);
        expect(metadata['bar']).toBe('baz');
      });

      it('should handle output with no metadata field', () => {
        const metadata = OutputModel.getMetadata(DEFAULT_STREAM);
        expect(Object.keys(metadata).length).toBe(0);
      });
    });
  });
});
