// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { OutputAreaModel } from '@jupyterlab/outputarea';
import { OutputModel } from '@jupyterlab/rendermime';
import { DEFAULT_OUTPUTS } from '@jupyterlab/rendermime/lib/testutils';

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
          values: DEFAULT_OUTPUTS,
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
        model.add(DEFAULT_OUTPUTS[0]);
        expect(called).toBe(true);
      });
    });

    describe('#stateChanged', () => {
      it('should be emitted when an item changes', () => {
        let called = false;
        model.add(DEFAULT_OUTPUTS[0]);
        model.stateChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args).toEqual(0);
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
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).toBe(1);
      });
    });

    describe('#trusted', () => {
      it('should be the trusted state of the model', () => {
        expect(model.trusted).toBe(false);
      });

      it('should cause all of the cells to `set`', () => {
        let called = 0;
        model.add(DEFAULT_OUTPUTS[0]);
        model.add(DEFAULT_OUTPUTS[1]);
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
        model.add(DEFAULT_OUTPUTS[0]);
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
        model.add(DEFAULT_OUTPUTS[0]);
        const output = model.get(0);
        expect(output.type).toBe(DEFAULT_OUTPUTS[0].output_type);
      });

      it('should return `undefined` if out of range', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.get(1)).toBeUndefined();
      });
    });

    describe('#add()', () => {
      it('should add an output', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        expect(model.length).toBe(1);
      });

      it('should consolidate consecutive stream outputs of the same kind', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).toBe(2);
        model.add(DEFAULT_OUTPUTS[2]);
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

      it('should reconcile stream with new lines after carriage returns', () => {
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['abc\r']
        });
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['\n-']
        });
        expect(model.get(0).toJSON().text).toBe('abc\n-');
      });

      it('should correctly merge lines if the first line does not end with new line', () => {
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['The meaning of life is....\nSome people... ']
        });
        model.add({
          name: 'stdout',
          output_type: 'stream',
          text: ['More text.']
        });
        expect(model.get(0).toJSON().text).toBe(
          'The meaning of life is....\nSome people... More text.'
        );
      });

      it('should be fast in sparse presence of returns and backspaces', () => {
        // locally this test run in 36 ms; setting it to 10 times
        // more to allow for slower runs on CI
        const timeout = 360;
        const size = 10 ** 7;
        const output = {
          name: 'stdout',
          output_type: 'stream',
          text: ['a'.repeat(size) + 'a\b' + 'a'.repeat(size)]
        };

        const start = performance.now();
        model.add(output);
        const end = performance.now();

        expect(end - start).toBeLessThan(timeout);
        expect(model.get(0).toJSON().text).toHaveLength(2 * size);
      });
    });

    describe('#clear()', () => {
      it('should clear all of the output', () => {
        for (const output of DEFAULT_OUTPUTS) {
          model.add(output);
        }
        model.clear();
        expect(model.length).toBe(0);
      });

      it('should wait for next add if requested', () => {
        model.add(DEFAULT_OUTPUTS[0]);
        model.clear(true);
        expect(model.length).toBe(1);
        model.add(DEFAULT_OUTPUTS[1]);
        expect(model.length).toBe(1);
      });
    });

    describe('#set', () => {
      it('should disconnect the replaced output', () => {
        const model = new OutputAreaModel({
          values: [DEFAULT_OUTPUTS[0]]
        });

        const output = model.get(0);
        let called = false;
        model.stateChanged.connect((sender, args) => {
          called = true;
        });

        model.set(0, DEFAULT_OUTPUTS[1]);

        output.setData({ ...output.data });

        expect(called).toEqual(false);
      });
    });

    describe('#fromJSON()', () => {
      it('should deserialize the model from JSON', () => {
        model.clear();
        model.fromJSON(DEFAULT_OUTPUTS);
        expect(model.toJSON().length).toBe(5);
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        expect(model.toJSON()).toEqual([]);
        model.fromJSON(DEFAULT_OUTPUTS);
        expect(model.toJSON().length).toBe(5);
      });
    });
  });

  describe('.ContentFactory', () => {
    describe('#createOutputModel()', () => {
      it('should create an output model', () => {
        const factory = new OutputAreaModel.ContentFactory();
        const model = factory.createOutputModel({
          value: DEFAULT_OUTPUTS[0]
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
