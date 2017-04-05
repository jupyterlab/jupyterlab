// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  OutputModel
} from '@jupyterlab/rendermime';

import {
  DEFAULT_OUTPUTS
} from '../utils';


const DEFAULT_EXECUTE: nbformat.IOutput = {
  output_type: 'execute_result',
  execution_count: 1,
  data: { 'text/plain': 'foo' },
  metadata: {
    'foo': 1,
    'bar': 'baz'
  }
};


const DEFAULT_STREAM: nbformat.IOutput = {
  name: 'stderr',
  output_type: 'stream',
  text: [
    'output to stderr\n'
  ]
};


describe('rendermime/outputmodel', () => {

  describe('OutputModel', () => {

    describe('#constructor()', () => {

      it('should create a new output model', () => {
        let value = DEFAULT_EXECUTE;
        let model = new OutputModel({ value });
        expect(model).to.be.an(OutputModel);
        model = new OutputModel({ value, trusted: true });
        expect(model).to.be.an(OutputModel);
      });

    });

    describe('#type', () => {

      it('should be the output type', () => {
        let model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.type).to.be(DEFAULT_EXECUTE.output_type);
        model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.type).to.be(DEFAULT_STREAM.output_type);
      });

    });

    describe('#executionCount', () => {

      it('should be the execution count of an execution result', () => {
        let model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.executionCount).to.be(1);
      });

      it('should be null for non-execution results', () => {
        let model = new OutputModel({ value: DEFAULT_STREAM });
        expect(model.executionCount).to.be(null);
      });

    });

    describe('#toJSON()', () => {

      it('should yield the raw value', () => {
        let model = new OutputModel({ value: DEFAULT_EXECUTE });
        expect(model.toJSON()).to.eql(DEFAULT_EXECUTE);
      });

    });

    describe('.getData()', () => {

      it('should handle all bundle types', () => {
        for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
          let output = DEFAULT_OUTPUTS[i];
          let bundle = OutputModel.getData(output);
          expect(Object.keys(bundle).length).to.not.be(0);
        }
      });

    });

    describe('.getMetadata()', () => {

      it('should get the metadata from the bundle', () => {
        let metadata = OutputModel.getMetadata(DEFAULT_EXECUTE);
        expect(metadata['foo']).to.be(1);
        expect(metadata['bar']).to.be('baz');
      });

      it('should handle output with no metadata field', () => {
        let metadata = OutputModel.getMetadata(DEFAULT_STREAM);
        expect(Object.keys(metadata).length).to.be(0);
      });

    });

  });

});
