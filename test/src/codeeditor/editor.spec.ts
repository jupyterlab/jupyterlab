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
