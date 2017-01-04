// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeEditor
} from '../../../lib/codeeditor';


describe('CodeEditor.Selections', () => {

  let selections: CodeEditor.Selections;
  let defaultSelections = [
    {
      uuid: 'foo',
      start: { line: 0, column: 0 },
      end: { line: 0, column: 1 },
    },
    {
      uuid: 'foo',
      start: { line: 1, column: 0 },
      end: { line: 1, column: 1 },
    },
  ];

  beforeEach(() => {
    selections = new CodeEditor.Selections();
  });

  describe('#changed', () => {

    it('should be emitted when a selection changes', () => {
      let called = false;
      selections.changed.connect((sender, args) => {
        expect(sender).to.be(selections);
        expect(args.uuid).to.be('foo');
        expect(args.oldSelections).to.eql([]);
        expect(args.newSelections).to.eql(defaultSelections);
        called = true;
      });
      selections.setSelections('foo', defaultSelections);
      expect(called).to.be(true);
    });

  });

  describe('#uuids', () => {

    it('should get the uuids of the selection owners', () => {
      expect(selections.uuids).to.eql([]);
      selections.setSelections('foo', defaultSelections);
      selections.setSelections('bar', defaultSelections);
      expect(selections.uuids).to.eql(['foo', 'bar']);
    });

  });

  describe('#getSelections()', () => {

    it('should get the selections for the selection owner', () => {
      selections.setSelections('foo', defaultSelections);
      expect(selections.getSelections('foo')).to.eql(defaultSelections);
    });

  });

  describe('#setSelections()', () => {

    it('should set the selections for the selection owner', () => {
      selections.setSelections('foo', defaultSelections);
      expect(selections.getSelections('foo')).to.eql(defaultSelections);
      selections.setSelections('foo', []);
      expect(selections.getSelections('foo')).to.eql([]);
    });

  });

});


describe('CodeEditor.Model', () => {

  let model: CodeEditor.Model;

  beforeEach(() => {
    model = new CodeEditor.Model();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('#constructor()', () => {

    it('should create a CodeEditor Model', () => {
      expect(model).to.be.a(CodeEditor.Model);
    });

  });

  describe('#mimeTypeChanged', () => {

    it('should be emitted when the mime type changes', () => {
      let called = false;
      model.mimeTypeChanged.connect((sender, args) => {
        expect(sender).to.be(model);
        expect(args.oldValue).to.be('text/plain');
        expect(args.newValue).to.be('text/foo');
        called = true;
      });
      model.mimeType = 'text/foo';
      expect(called).to.be(true);
    });

  });

  describe('#value', () => {

    it('should be the observable value of the model', () => {
      let called = false;
      model.value.changed.connect((sender, args) => {
        console.log('hi', args.value)
        expect(sender).to.be(model.value);
        expect(args.type).to.be('set');
        expect(args.value).to.be('foo');
        called = true;
      });
      model.value.text = 'foo';
      expect(called).to.be(true);
    });

    it('should handle an insert', () => {
      let called = false;
      model.value.changed.connect((sender, args) => {
        expect(args.type).to.be('insert');
        expect(args.value).to.be('foo');
        called = true;
      });
      model.value.insert(0, 'foo');
      expect(called).to.be(true);
    });

    it('should handle a remove', () => {
      let called = false;
      model.value.text = 'foo';
      model.value.changed.connect((sender, args) => {
        expect(args.type).to.be('remove');
        expect(args.value).to.be('f');
        called = true;
      });
      model.value.remove(0, 1);
      expect(called).to.be(true);
    });

  });

  describe('#selections', () => {

    it('should be the selections associated with the model', () => {
      expect(model.selections.uuids.length).to.be(0);
    });

  });

  describe('#mimeType', () => {

    it('should be the mime type of the model', () => {
      expect(model.mimeType).to.be('text/plain');
      model.mimeType = 'text/foo';
      expect(model.mimeType).to.be('text/foo');
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the model is disposed', () => {
      expect(model.isDisposed).to.be(false);
      model.dispose();
      expect(model.isDisposed).to.be(true);
    });

  });

});
