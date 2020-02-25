// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import * as nbformat from '@jupyterlab/nbformat';

import { OutputModel } from '@jupyterlab/rendermime';

import { NBTestUtils } from '@jupyterlab/testutils';

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
        expect(model).to.be.an.instanceof(OutputModel);
        model = new OutputModel({ value, trusted: true });
        expect(model).to.be.an.instanceof(OutputModel);
      });
    });

    describe('#type', () => {
      it('should be the output type', () => {
        let model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.type).to.equal(DEFAULT_EXECUTE.output_type);
        model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.type).to.equal(DEFAULT_STREAM.output_type);
      });
    });

    describe('#executionCount', () => {
      it('should be the execution count of an execution result', () => {
        const model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.executionCount).to.equal(1);
      });

      it('should be null for non-execution results', () => {
        const model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.executionCount).to.be.null;
      });
    });

    describe('#toJSON()', () => {
      it('should yield the raw value', () => {
        const model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.toJSON()).to.deep.equal(DEFAULT_EXECUTE);
      });
    });

    describe('.getData()', () => {
      it('should handle all bundle types', () => {
        for (let i = 0; i < NBTestUtils.DEFAULT_OUTPUTS.length; i++) {
          const output = NBTestUtils.DEFAULT_OUTPUTS[i];
          const bundle = OutputModel.getData(output);
          expect(Object.keys(bundle).length).to.not.equal(0);
        }
      });
    });

    describe('.getMetadata()', () => {
      it('should get the metadata from the bundle', () => {
        const metadata = OutputModel.getMetadata(DEFAULT_EXECUTE);
        expect(metadata['foo']).to.equal(1);
        expect(metadata['bar']).to.equal('baz');
      });

      it('should handle output with no metadata field', () => {
        const metadata = OutputModel.getMetadata(DEFAULT_STREAM);
        expect(Object.keys(metadata).length).to.equal(0);
      });
    });
  });
});
