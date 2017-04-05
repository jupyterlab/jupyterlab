// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  CompleterModel, CompleterWidget
} from '@jupyterlab/completer';


function makeState(text: string): CompleterWidget.ITextState {
  return {
    column: 0,
    lineHeight: 0,
    charWidth: 0,
    line: 0,
    coords: { left: 0, right: 0, top: 0, bottom: 0 } as CodeEditor.ICoordinate,
    text
  };
}


describe('completer/model', () => {

  describe('CompleterModel', () => {

    describe('#constructor()', () => {

      it('should create a completer model', () => {
        let model = new CompleterModel();
        expect(model).to.be.a(CompleterModel);
      });

    });

    describe('#stateChanged', () => {

      it('should signal when model options have changed', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.setOptions(['foo']);
        expect(called).to.be(1);
        model.setOptions([]);
        expect(called).to.be(2);
      });

      it('should not signal when options have not changed', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.setOptions(['foo']);
        model.setOptions(['foo']);
        expect(called).to.be(1);
        model.setOptions([]);
        model.setOptions([]);
        expect(called).to.be(2);
      });

      it('should signal when original request changes', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = makeState('foo');
        expect(called).to.be(1);
        model.original = null;
        expect(called).to.be(2);
      });

      it('should not signal when original request has not changed', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => { called++; };
        model.stateChanged.connect(listener);
        expect(called).to.be(0);
        model.original = makeState('foo');
        model.original = makeState('foo');
        expect(called).to.be(1);
        model.original = null;
        model.original = null;
        expect(called).to.be(2);
      });

      it('should signal when current text changes', () => {
        let model = new CompleterModel();
        let called = 0;
        let currentValue = 'foo';
        let newValue = 'foob';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
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

      it('should not signal when current text is unchanged', () => {
        let model = new CompleterModel();
        let called = 0;
        let currentValue = 'foo';
        let newValue = 'foob';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
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

    describe('#items()', () => {

      it('should return an unfiltered list of items if query is blank', () => {
        let model = new CompleterModel();
        let want: CompleterWidget.IItem[] = [
          { raw: 'foo', text: 'foo' },
          { raw: 'bar', text: 'bar' },
          { raw: 'baz', text: 'baz' }
        ];
        model.setOptions(['foo', 'bar', 'baz']);
        expect(toArray(model.items())).to.eql(want);
      });

      it('should return a filtered list of items if query is set', () => {
        let model = new CompleterModel();
        let want: CompleterWidget.IItem[] = [
          { raw: 'foo', text: '<mark>f</mark>oo' }
        ];
        model.setOptions(['foo', 'bar', 'baz']);
        model.query = 'f';
        expect(toArray(model.items())).to.eql(want);
      });

      it('should order list based on score', () => {
        let model = new CompleterModel();
        let want: CompleterWidget.IItem[] = [
          { raw: 'qux', text: '<mark>qux</mark>' },
          { raw: 'quux', text: '<mark>qu</mark>u<mark>x</mark>' }
        ];
        model.setOptions(['foo', 'bar', 'baz', 'quux', 'qux']);
        model.query = 'qux';
        expect(toArray(model.items())).to.eql(want);
      });

      it('should break ties in score by locale sort', () => {
        let model = new CompleterModel();
        let want: CompleterWidget.IItem[] = [
          { raw: 'quux', text: '<mark>qu</mark>ux' },
          { raw: 'qux', text: '<mark>qu</mark>x' }
        ];
        model.setOptions(['foo', 'bar', 'baz', 'qux', 'quux']);
        model.query = 'qu';
        expect(toArray(model.items())).to.eql(want);
      });

    });

    describe('#options()', () => {

      it('should default to an empty iterator', () => {
        let model = new CompleterModel();
        expect(model.options().next()).to.be(void 0);
      });

      it('should return model options', () => {
        let model = new CompleterModel();
        let options = ['foo'];
        model.setOptions(options);
        expect(toArray(model.options())).to.not.equal(options);
        expect(toArray(model.options())).to.eql(options);
      });

    });

    describe('#original', () => {

      it('should default to null', () => {
        let model = new CompleterModel();
        expect(model.original).to.be(null);
      });

      it('should return the original request', () => {
        let model = new CompleterModel();
        let request = makeState('foo');
        model.original = request;
        expect(model.original).to.equal(request);
      });

    });

    describe('#current', () => {

      it('should default to null', () => {
        let model = new CompleterModel();
        expect(model.current).to.be(null);
      });

      it('should not set if original request is nonexistent', () => {
        let model = new CompleterModel();
        let currentValue = 'foo';
        let newValue = 'foob';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
        model.current = change;
        expect(model.current).to.be(null);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(change);
      });

      it('should not set if cursor is nonexistent', () => {
        let model = new CompleterModel();
        let currentValue = 'foo';
        let newValue = 'foob';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
        model.original = request;
        model.current = change;
        expect(model.current).to.be(null);
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(change);
      });

      it('should reset model if change is shorter than original', () => {
        let model = new CompleterModel();
        let currentValue = 'foo';
        let newValue = 'fo';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).to.be(null);
        expect(model.original).to.be(null);
        expect(model.options().next()).to.be(void 0);
      });

    });

    describe('#cursor', () => {

      it('should default to null', () => {
        let model = new CompleterModel();
        expect(model.cursor).to.be(null);
      });

      it('should not set if original request is nonexistent', () => {
        let model = new CompleterModel();
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState('foo');
        model.cursor = cursor;
        expect(model.cursor).to.be(null);
        model.original = request;
        model.cursor = cursor;
        expect(model.cursor).to.be(cursor);
      });

    });

    describe('#isDisposed', () => {

      it('should be true if model has been disposed', () => {
        let model = new CompleterModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the model resources', () => {
        let model = new CompleterModel();
        model.setOptions(['foo']);
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let model = new CompleterModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#handleTextChange()', () => {

      it('should set current change value', () => {
        let model = new CompleterModel();
        let currentValue = 'foo';
        let newValue = 'foob';
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 0 };
        let request = makeState(currentValue);
        let change = makeState(newValue);
        (change as any).column = 4;
        model.original = request;
        model.cursor = cursor;
        expect(model.current).to.be(null);
        model.handleTextChange(change);
        expect(model.current).to.be.ok();
      });

      it('should reset model if last character of change is whitespace', () => {
        let model = new CompleterModel();
        let currentValue = 'foo';
        let newValue = 'foo ';
        let request = makeState(currentValue);
        let change = makeState(newValue);
        (change as any).column = 4;
        model.original = request;
        expect(model.original).to.be.ok();
        model.handleTextChange(change);
        expect(model.original).to.be(null);
      });

    });

    describe('#createPatch()', () => {

      it('should return a patch value', () => {
        let model = new CompleterModel();
        let patch = 'foobar';
        let want: CompleterWidget.IPatch = {
          text: patch,
          offset: patch.length
        };
        let cursor: CompleterWidget.ICursorSpan = { start: 0, end: 3 };
        model.original = makeState('foo');
        model.cursor = cursor;
        expect(model.createPatch(patch)).to.eql(want);
      });

      it('should return null if original request or cursor are null', () => {
        let model = new CompleterModel();
        expect(model.createPatch('foo')).to.be(null);
      });

      it('should handle line breaks in original value', () => {
        let model = new CompleterModel();
        let currentValue = 'foo\nbar';
        let patch = 'barbaz';
        let start = currentValue.length;
        let end = currentValue.length;
        let want: CompleterWidget.IPatch = {
          text: currentValue + patch,
          offset: currentValue.length + patch.length
        };
        let cursor: CompleterWidget.ICursorSpan = { start, end };
        model.original = makeState(currentValue);
        model.cursor = cursor;
        expect(model.createPatch(patch)).to.eql(want);
      });

    });

  });

});
