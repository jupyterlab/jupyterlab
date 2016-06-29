// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  CompletionModel, ICursorSpan, ICompletionItem, ICompletionPatch
} from '../../../../lib/notebook/completion';

import {
  ICompletionRequest, ICoords, ITextChange
} from '../../../../lib/notebook/cells/editor'


class TestModel extends CompletionModel {
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
        model.cursor = cursor;
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
        model.cursor = cursor;
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

      it('should order list based on score', () => {
        let model = new TestModel();
        let want: ICompletionItem[] = [
          { raw: 'qux', text: '<mark>qux</mark>' },
          { raw: 'quux', text: '<mark>qu</mark>u<mark>x</mark>' }
        ];
        model.options = ['qux', 'quux'];
        model.setQuery('qux');
        expect(model.items).to.eql(want);
      });

    });

    describe('#options', () => {

      it('should default to null', () => {
        let model = new CompletionModel();
        expect(model.options).to.be(null);
      });

      it('should return model options', () => {
        let model = new CompletionModel();
        let options = ['foo'];
        model.options = options;
        expect(model.options).to.not.equal(options);
        expect(model.options).to.eql(options);
      });

    });

    describe('#original', () => {

      it('should default to null', () => {
        let model = new CompletionModel();
        expect(model.original).to.be(null);
      });

      it('should return the original request', () => {
        let model = new CompletionModel();
        let currentValue = 'foo';
        let coords: ICoords = null;
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        model.original = request;
        expect(model.original).to.equal(request);
      });

    });

    describe('#current', () => {

      it('should default to null', () => {
        let model = new CompletionModel();
        expect(model.current).to.be(null);
      });

      it('should not set if original request is nonexistent', () => {
        let model = new TestModel();
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
        model.current = change;
        expect(model.current).to.be(null);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(change);
      });

      it('should not set if cursor is nonexistent', () => {
        let model = new TestModel();
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
        model.original = request;
        model.current = change;
        expect(model.current).to.be(null);
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(change);
      });

      it('should reset model if change is shorter than original', () => {
        let model = new TestModel();
        let currentValue = 'foo';
        let oldValue = currentValue;
        let newValue = 'fo';
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 0 };
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let change: ITextChange = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, oldValue, newValue
        };
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(null);
        expect(model.original).to.be(null);
        expect(model.options).to.be(null);
      });

    });

    describe('#cursor', () => {

      it('should default to null', () => {
        let model = new CompletionModel();
        expect(model.cursor).to.be(null);
      });

      it('should not set if original request is nonexistent', () => {
        let model = new TestModel();
        let currentValue = 'foo';
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 0 };
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        model.cursor = cursor;
        expect(model.cursor).to.be(null);
        model.original = request;
        model.cursor = cursor;
        expect(model.cursor).to.be(cursor);
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

    describe('#dispose()', () => {

      it('should dispose of the model resources', () => {
        let model = new CompletionModel();
        model.options = ['foo'];
        expect(model.isDisposed).to.be(false);
        expect(model.options).to.be.ok();
        model.dispose();
        expect(model.isDisposed).to.be(true);
        expect(model.options).to.not.be.ok();
      });

      it('should be safe to call multiple times', () => {
        let model = new CompletionModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#handleTextChange()', () => {

      it('should set current change value', () => {
        let model = new CompletionModel();
        let currentValue = 'foo';
        let oldValue = currentValue;
        let newValue = 'foob';
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 0 };
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let change: ITextChange = {
          ch: 4, chHeight: 0, chWidth: 0, line: 0, coords, oldValue, newValue
        };
        model.original = request;
        model.cursor = cursor;
        expect(model.current).to.be(null);
        model.handleTextChange(change);
        expect(model.current).to.be.ok();
      });

      it('should reset model if last character of change is whitespace', () => {
        let model = new CompletionModel();
        let currentValue = 'foo';
        let oldValue = currentValue;
        let newValue = 'foo ';
        let coords: ICoords = null;
        let request: ICompletionRequest = {
          ch: 0, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        let change: ITextChange = {
          ch: 4, chHeight: 0, chWidth: 0, line: 0, coords, oldValue, newValue
        };
        model.original = request;
        expect(model.original).to.be.ok();
        model.handleTextChange(change);
        expect(model.original).to.be(null);
      });

    });

    describe('#createPatch()', () => {

      it('should return a patch value', () => {
        let model = new CompletionModel();
        let currentValue = 'foo';
        let patch = 'foobar';
        let want: ICompletionPatch = { text: patch, position: patch.length };
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 3 };
        let request: ICompletionRequest = {
          ch: 3, chHeight: 0, chWidth: 0, line: 0, coords, currentValue
        };
        model.original = request;
        model.cursor = cursor;
        expect(model.createPatch(patch)).to.eql(want);
      });

      it('should return null if original request or cursor are null', () => {
        let model = new CompletionModel();
        expect(model.createPatch('foo')).to.be(null);
      });

      it('should handle line breaks in original value', () => {
        let model = new CompletionModel();
        let currentValue = 'foo\nbar';
        let patch = 'barbaz';
        let want: ICompletionPatch = { text: 'foo\nbarbaz', position: 10 };
        let coords: ICoords = null;
        let cursor: ICursorSpan = { start: 0, end: 3 };
        let request: ICompletionRequest = {
          ch: 3, chHeight: 0, chWidth: 0, line: 1, coords, currentValue
        };
        model.original = request;
        model.cursor = cursor;
        expect(model.createPatch(patch)).to.eql(want);
      });

    });

  });

});
