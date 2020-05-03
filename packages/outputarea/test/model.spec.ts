// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { OutputModel } from '@jupyterlab/rendermime';

import { OutputAreaModel } from '@jupyterlab/outputarea';

import { NBTestUtils } from '@jupyterlab/testutils';

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
        expect(model).toBeInstanceOf(OutputAreaModel);
      });

      it('should accept options', () => {
        const contentFactory = new OutputAreaModel.ContentFactory();
        model = new OutputAreaModel({
          values: NBTestUtils.DEFAULT_OUTPUTS,
          contentFactory,
          trusted: true
        });
        expect(model.contentFactory).toBe(contentFactory);
        expect(model.trusted).toBe(true);
      });
    });

    describe('#changed', () => {
      it('should be emitted when the model changes', () => {
        let called = false;
        model.changed.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.type).toBe('add');
          expect(args.oldIndex).toBe(-1);
          expect(args.newIndex).toBe(0);
          expect(args.oldValues.length).toBe(0);
          called = true;
        });
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(called).toBe(true);
      });
    });

    describe('#stateChanged', () => {
      it('should be emitted when an item changes', () => {
        let called = false;
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        model.stateChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args).toBeUndefined();
          called = true;
        });
        const output = model.get(0);
        output.setData({ ...output.data });
        expect(called).toBe(true);
      });
    });

    describe('#length', () => {
      it('should get the length of the items in the model', () => {
        expect(model.length).toBe(0);
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.length).toBe(1);
      });
    });

    describe('#trusted', () => {
      it('should be the trusted state of the model', () => {
        expect(model.trusted).toBe(false);
      });

      it('should cause all of the cells to `set`', () => {
        let called = 0;
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        model.add(NBTestUtils.DEFAULT_OUTPUTS[1]);
        model.changed.connect(() => {
          called++;
        });
        model.trusted = true;
        expect(called).toBe(2);
      });
    });

    describe('#contentFactory', () => {
      it('should be the content factory used by the model', () => {
        expect(model.contentFactory).toBe(
          OutputAreaModel.defaultContentFactory
        );
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the model is disposed', () => {
        expect(model.isDisposed).toBe(false);
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the model', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        model.dispose();
        expect(model.isDisposed).toBe(true);
        expect(model.length).toBe(0);
      });

      it('should be safe to call more than once', () => {
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#get()', () => {
      it('should get the item at the specified index', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        const output = model.get(0);
        expect(output.type).toBe(NBTestUtils.DEFAULT_OUTPUTS[0].output_type);
      });

      it('should return `undefined` if out of range', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.get(1)).toBeUndefined();
      });
    });

    describe('#add()', () => {
      it('should add an output', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        expect(model.length).toBe(1);
      });

      it('should consolidate consecutive stream outputs of the same kind', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        model.add(NBTestUtils.DEFAULT_OUTPUTS[1]);
        expect(model.length).toBe(2);
        model.add(NBTestUtils.DEFAULT_OUTPUTS[2]);
        expect(model.length).toBe(2);
      });

      it('should remove carriage returns and backspaces from streams', () => {
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['Jupyter\rj']
        });
        expect(model.get(0).toJSON().text).toBe('jupyter');
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['\njj\bupyter']
        });
        expect(model.get(0).toJSON().text).toBe('jupyter\njupyter');
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['\r\r\njupyter']
        });
        expect(model.get(0).toJSON().text).toBe('jupyter\njupyter\njupyter');
      });
    });

    describe('#clear()', () => {
      it('should clear all of the output', () => {
        for (const output of NBTestUtils.DEFAULT_OUTPUTS) {
          model.add(output);
        }
        model.clear();
        expect(model.length).toBe(0);
      });

      it('should wait for next add if requested', () => {
        model.add(NBTestUtils.DEFAULT_OUTPUTS[0]);
        model.clear(true);
        expect(model.length).toBe(1);
        model.add(NBTestUtils.DEFAULT_OUTPUTS[1]);
        expect(model.length).toBe(1);
      });
    });

    describe('#fromJSON()', () => {
      it('should deserialize the model from JSON', () => {
        model.clear();
        model.fromJSON(NBTestUtils.DEFAULT_OUTPUTS);
        expect(model.toJSON().length).toBe(5);
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        expect(model.toJSON()).toEqual([]);
        model.fromJSON(NBTestUtils.DEFAULT_OUTPUTS);
        expect(model.toJSON().length).toBe(5);
      });
    });
  });

  describe('.ContentFactory', () => {
    describe('#createOutputModel()', () => {
      it('should create an output model', () => {
        const factory = new OutputAreaModel.ContentFactory();
        const model = factory.createOutputModel({
          value: NBTestUtils.DEFAULT_OUTPUTS[0]
        });
        expect(model).toBeInstanceOf(OutputModel);
      });
    });
  });

  describe('.defaultContentFactory', () => {
    it('should be an instance of ContentFactory', () => {
      expect(OutputAreaModel.defaultContentFactory).toBeInstanceOf(
        OutputAreaModel.ContentFactory
      );
    });
  });
});
