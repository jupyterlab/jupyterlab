// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  deepEqual
} from 'phosphor/lib/algorithm/json';

import {
  OutputAreaModel
} from '../../../../lib/notebook/output-area/model';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';


/**
 * The default outputs used for testing.
 */
export
const DEFAULT_OUTPUTS: nbformat.IOutput[] = [
  {
   name: 'stdout',
   output_type: 'stream',
   text: [
    'hello world\n',
    '0\n',
    '1\n',
    '2\n'
   ]
  },
  {
   name: 'stderr',
   output_type: 'stream',
   text: [
    'output to stderr\n'
   ]
  },
  {
   name: 'stderr',
   output_type: 'stream',
   text: [
    'output to stderr2\n'
   ]
  },
  {
    output_type: 'execute_result',
    execution_count: 1,
    data: { 'text/plain': 'foo' },
    metadata: {}
  },
  {
   output_type: 'display_data',
   data: { 'text/plain': 'hello, world' },
   metadata: {}
  },
  {
    output_type: 'error',
    ename: 'foo',
    evalue: 'bar',
    traceback: ['fizz', 'buzz']
  }
];


describe('notebook/output-area/model', () => {

  describe('OutputAreaModel', () => {

    describe('#constructor()', () => {

      it('should create an output area model', () => {
        let model = new OutputAreaModel();
        expect(model).to.be.an(OutputAreaModel);
      });

    });

    describe('#changed', () => {

      it('should be emitted when the model changes', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.changed.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('add');
          expect(args.oldIndex).to.be(-1);
          expect(args.newIndex).to.be(0);
          expect(args.oldValue).to.be(void 0);
          expect(deepEqual(args.newValue as nbformat.IOutput, DEFAULT_OUTPUTS[0]));
          called = true;
        });
        model.add(DEFAULT_OUTPUTS[0]);
        expect(called).to.be(true);
      });

    });

    describe('#length', () => {

      it('should get the length of the items in the model', () => {
        let model = new OutputAreaModel();
        expect(model.length).to.be(0);
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).to.be(1);
      });

      it('should be read-only', () => {
        let model = new OutputAreaModel();
        expect(() => { model.length = 0; }).to.throwError();
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the model is disposed', () => {
        let model = new OutputAreaModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let model = new OutputAreaModel();
        expect(() => { model.isDisposed = true; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the model', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.length).to.be(0);
      });

      it('should be safe to call more than once', () => {
        let model = new OutputAreaModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#get()', () => {

      it('should get the item at the specified index', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        let output = model.get(0);
        expect(output).to.not.be(DEFAULT_OUTPUTS[0]);
        expect(output.output_type).to.be(DEFAULT_OUTPUTS[0].output_type);
      });

      it('should return `undefined` if out of range', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.get(1)).to.be(void 0);
      });

    });

    describe('#add()', () => {

      it('should add an output', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).to.be(1);
      });

      it('should consolidate consecutive stream outputs of the same kind', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).to.be(2);
        model.add(DEFAULT_OUTPUTS[2]);
        expect(model.length).to.be(2);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the output', () => {
        let model = new OutputAreaModel();
        for (let output of DEFAULT_OUTPUTS) {
          model.add(output);
        }
        model.clear();
        expect(model.length).to.be(0);
      });

      it('should wait for next add if requested', () => {
        let model = new OutputAreaModel();
        model.add(DEFAULT_OUTPUTS[0]);
        model.clear(true);
        expect(model.length).to.be(1);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).to.be(1);
      });
    });

    describe('#execute()', () => {

      it('should execute code on a kernel and send outputs to the model', (done) => {
        let kernel = new MockKernel();
        let model = new OutputAreaModel();
        expect(model.length).to.be(0);
        model.execute('foo', kernel).then(reply => {
          expect(reply.content.execution_count).to.be(1);
          expect(reply.content.status).to.be('ok');
          expect(model.length).to.be(1);
          done();
        });
      });

      it('should clear existing outputs', (done) => {
        let kernel = new MockKernel();
        let model = new OutputAreaModel();
        for (let output of DEFAULT_OUTPUTS) {
          model.add(output);
        }
        model.execute('foo', kernel).then(reply => {
          expect(reply.content.execution_count).to.be(1);
          expect(model.length).to.be(1);
          done();
        });
      });

    });

  });

});
