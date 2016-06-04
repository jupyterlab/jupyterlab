// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  ObservableList
} from 'phosphor-observablelist';

import {
  OutputAreaModel
} from '../../../../lib/notebook/output-area/model';

import {
  IOutput, IStream
} from '../../../../lib/notebook/notebook/nbformat';


describe('jupyter-js-notebook', () => {

  describe('OutputAreaModel', () => {

    describe('#constructor()', () => {

      it('should create an output area model', () => {
        let model = new OutputAreaModel();
        expect(model instanceof OutputAreaModel).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('trusted');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.trusted = true;
        expect(called).to.be(true);
      });

    });

    describe('#outputs', () => {

      it('should be an observable list', () => {
        let model = new OutputAreaModel();
        expect(model.outputs instanceof ObservableList).to.be(true);
      });

      it('should be read-only', () => {
        let model = new OutputAreaModel();
        expect(() => { model.outputs = null; }).to.throwError();
      });

    });

    describe('#trusted', () => {

      it('should default to false', () => {
        let model = new OutputAreaModel();
        expect(model.trusted).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('trusted');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.trusted = true;
        expect(called).to.be(true);
      });

      it('should not emit the signal when there is no change', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          called = true;
        });
        model.trusted = false;
        expect(called).to.be(false);
      });

    });

    describe('#fixedHeight', () => {

      it('should default to false', () => {
        let model = new OutputAreaModel();
        expect(model.fixedHeight).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('fixedHeight');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.fixedHeight = true;
        expect(called).to.be(true);
      });

      it('should not emit the signal when there is no change', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          called = true;
        });
        model.fixedHeight = false;
        expect(called).to.be(false);
      });

    });

    describe('#collapsed', () => {

      it('should default to false', () => {
        let model = new OutputAreaModel();
        expect(model.collapsed).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          expect(change.name).to.be('collapsed');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.collapsed = true;
        expect(called).to.be(true);
      });

      it('should not emit the signal when there is no change', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect((editor, change) => {
          called = true;
        });
        model.collapsed = false;
        expect(called).to.be(false);
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the model is disposed', () => {
        let model = new OutputAreaModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should clear signal data on the model', () => {
        let model = new OutputAreaModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dispose();
        model.collapsed = true;
        expect(called).to.be(false);
      });

      it('should be safe to call multiple times', () => {
        let model = new OutputAreaModel();
        model.dispose();
        model.dispose();
      });

    });

    describe('#add()', () => {

      it('should add an output', () => {
        let output: IStream = {
          output_type: 'stream',
          name: 'stdout',
          text: 'foo\nbar'
        }
        let model = new OutputAreaModel();
        model.add(output);
        expect(model.outputs.length).to.be(1);
      });

      it('should consolidate consecutive stream outputs of the same kind', () => {
        let output: IStream = {
          output_type: 'stream',
          name: 'stdout',
          text: 'foo\nbar'
        }
        let model = new OutputAreaModel();
        model.add(output);
        output = {
          output_type: 'stream',
          name: 'stdout',
          text: 'fizz\buzz'
        }
        model.add(output);
        expect(model.outputs.length).to.be(1);
        output  = {
          output_type: 'stream',
          name: 'stderr',
          text: 'oh no!'
        }
        model.add(output);
        expect(model.outputs.length).to.be(2);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the output', () => {
        let output: IStream = {
          output_type: 'stream',
          name: 'stdout',
          text: 'foo\nbar'
        }
        let model = new OutputAreaModel();
        model.add(output);
        model.clear();
        expect(model.outputs.length).to.be(0);
      });

      it('should wait for next add if requested', () => {
        let output: IStream = {
          output_type: 'stream',
          name: 'stdout',
          text: 'foo\nbar'
        }
        let model = new OutputAreaModel();
        model.add(output);
        model.clear(true);
        expect(model.outputs.length).to.be(1);
        let output2 = {
          output_type: 'error',
          ename: 'foo',
          evalue: '',
          traceback: ['']
        }
        model.add(output);
        expect(model.outputs.length).to.be(1);
      });
    });

  });

});
