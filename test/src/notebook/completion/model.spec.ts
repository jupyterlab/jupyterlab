// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CompletionModel, ICursorSpan, ICompletionItem
} from '../../../../lib/notebook/completion';

import {
  ICompletionRequest, ICoords, ITextChange
} from '../../../../lib/notebook/cells/editor'


class TestModel extends CompletionModel {
  setCursor(cursor: ICursorSpan) {
    super.setCursor(cursor);
  }

  setQuery(query: string) {
    super.setQuery(query);
  }
}


describe('notebook/completion/model', () => {

  describe('CompletionModel', () => {

    describe('#constructor()', () => {

      it('should create a completion model', () => {
        let model = new CompletionModel();
        expect(model).to.be.a(CompletionModel);
      });

    });

    describe('#isDisposed', () => {

      it('should be true if model has been disposed', () => {
        let model = new CompletionModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should signal when model options have changed', () => {
        let model = new CompletionModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.options = ['foo'];
        expect(called).to.be(1);
        model.options = null;
        expect(called).to.be(2);
      });

      it('should not signal when options have not changed', () => {
        let model = new CompletionModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.options = ['foo'];
        model.options = ['foo'];
        expect(called).to.be(1);
        model.options = null;
        model.options = null;
        expect(called).to.be(2);
      });

      it('should signal when original request changes', () => {
        let model = new CompletionModel();
        let called = 0;
        let currentValue = 'foo';
        let coords: ICoords = null;
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = request;
        expect(called).to.be(1);
        model.original = null;
        expect(called).to.be(2);
      });

      it('should not signal when original request has not changed', () => {
        let model = new CompletionModel();
        let called = 0;
        let currentValue = 'foo';
        let coords: ICoords = null;
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = request;
        model.original = request;
        expect(called).to.be(1);
        model.original = null;
        model.original = null;
        expect(called).to.be(2);
      });

      it('should signal when current text changes', () => {
        let model = new TestModel();
        let called = 0;
        let currentValue = 'foo';
        let oldValue = currentValue;
        let newValue = 'foob';
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 0 };
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let change: ITextChange = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, oldValue, newValue
        };
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = request;
        expect(called).to.be(1);
        model.setCursor(cursor);
        model.current = change;
        expect(called).to.be(2);
        model.current = null;
        expect(called).to.be(3);
      });

      it('should not signal when current text has not change', () => {
        let model = new TestModel();
        let called = 0;
        let currentValue = 'foo';
        let oldValue = currentValue;
        let newValue = 'foob';
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 0 };
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let change: ITextChange = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, oldValue, newValue
        };
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = request;
        expect(called).to.be(1);
        model.setCursor(cursor);
        model.current = change;
        model.current = change;
        expect(called).to.be(2);
        model.current = null;
        model.current = null;
        expect(called).to.be(3);
      });

    });

    describe('#items', () => {

      it('should return an unfiltered list of items if query is blank', () => {
        let model = new CompletionModel();
        let want: ICompletionItem[] = [
          { raw: 'foo', text: 'foo' },
          { raw: 'bar', text: 'bar' },
          { raw: 'baz', text: 'baz' }
        ];
        model.options = ['foo', 'bar', 'baz'];
        expect(model.items).to.eql(want);
      });

      it('should return a filtered list of items if query is set', () => {
        let model = new TestModel();
        let want: ICompletionItem[] = [
          { raw: 'foo', text: '<mark>f</mark>oo' }
        ];
        model.options = ['foo', 'bar', 'baz'];
        model.setQuery('f');
        expect(model.items).to.eql(want);
      });

    });

  });

});
