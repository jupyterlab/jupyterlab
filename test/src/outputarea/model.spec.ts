// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  OutputModel
} from '@jupyterlab/rendermime';

import {
  OutputAreaModel
} from '@jupyterlab/outputarea';

import {
  DEFAULT_OUTPUTS
} from '../utils';


describe('outputarea/model', () => {

  let model: OutputAreaModel;

  beforeEach(() => {
    model = new OutputAreaModel();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('OutputAreaModel', () => {

    describe('#constructor()', () => {

      it('should create an output area model', () => {
        expect(model).to.be.an(OutputAreaModel);
      });

      it('should accept options', () => {
        let contentFactory = new OutputAreaModel.ContentFactory();
        model = new OutputAreaModel({
          values: DEFAULT_OUTPUTS,
          contentFactory,
          trusted: true
        });
        expect(model.contentFactory).to.be(contentFactory);
        expect(model.trusted).to.be(true);
      });

    });

    describe('#changed', () => {

      it('should be emitted when the model changes', () => {
        let called = false;
        model.changed.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.type).to.be('add');
          expect(args.oldIndex).to.be(-1);
          expect(args.newIndex).to.be(0);
          expect(args.oldValues.length).to.be(0);
          called = true;
        });
        model.add(DEFAULT_OUTPUTS[0]);
        expect(called).to.be(true);
      });
    });

    describe('#stateChanged', () => {

      it('should be emitted when an item changes', () => {
        let called = false;
        model.add(DEFAULT_OUTPUTS[0]);
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args).to.be(void 0);
          called = true;
        });
        let output = model.get(0);
        output.data.set('foo', 1);
        expect(called).to.be(true);
      });

    });

    describe('#length', () => {

      it('should get the length of the items in the model', () => {
        expect(model.length).to.be(0);
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).to.be(1);
      });

    });

    describe('#trusted', () => {

      it('should be the trusted state of the model', () => {
        expect(model.trusted).to.be(false);
      });

      it('should cause all of the cells to `set`', () => {
        let called = 0;
        model.add(DEFAULT_OUTPUTS[0]);
        model.add(DEFAULT_OUTPUTS[1]);
        model.changed.connect(() => {
          called++;
        });
        model.trusted = true;
        expect(called).to.be(2);
      });

    });

    describe('#contentFactory', () => {

      it('should be the content factory used by the model', () => {
        expect(model.contentFactory).to.be(OutputAreaModel.defaultContentFactory);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the model is disposed', () => {
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the model', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.length).to.be(0);
      });

      it('should be safe to call more than once', () => {
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#get()', () => {

      it('should get the item at the specified index', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        let output = model.get(0);
        expect(output.type).to.be(DEFAULT_OUTPUTS[0].output_type);
      });

      it('should return `undefined` if out of range', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.get(1)).to.be(void 0);
      });

    });

    describe('#add()', () => {

      it('should add an output', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).to.be(1);
      });

      it('should consolidate consecutive stream outputs of the same kind', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).to.be(2);
        model.add(DEFAULT_OUTPUTS[2]);
        expect(model.length).to.be(2);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the output', () => {
        for (let output of DEFAULT_OUTPUTS) {
          model.add(output);
        }
        model.clear();
        expect(model.length).to.be(0);
      });

      it('should wait for next add if requested', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        model.clear(true);
        expect(model.length).to.be(1);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).to.be(1);
      });

    });

    describe('#fromJSON()', () => {

      it('should deserialize the model from JSON', () => {
        model.clear();
        model.fromJSON(DEFAULT_OUTPUTS);
        expect(model.toJSON().length).to.be(5);
      });

    });

    describe('#toJSON()', () => {

      it('should serialize the model to JSON', () => {
        expect(model.toJSON()).to.eql([]);
        model.fromJSON(DEFAULT_OUTPUTS);
        expect(model.toJSON().length).to.be(5);
      });

    });

  });

  describe('.ContentFactory', () => {

    describe('#createOutputModel()', () => {

      it('should create an output model', () => {
        let factory = new OutputAreaModel.ContentFactory();
        let model = factory.createOutputModel({ value: DEFAULT_OUTPUTS[0] });
        expect(model).to.be.an(OutputModel);
      });

    });

  });

  describe('.defaultContentFactory', () => {

    it('should be an instance of ContentFactory', () => {
      expect(OutputAreaModel.defaultContentFactory).to.be.an(OutputAreaModel.ContentFactory);
    });

  });

});
