// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  Metadata
} from '../../../lib/common/metadata';

import {
  RawCellModel
} from '../../../lib/cells';


class LogEditor extends Metadata.Editor {

  methods: string[] = [];

  events: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onMetadataChanged(msg: Metadata.ChangeMessage) {
    super.onMetadataChanged(msg);
    this.methods.push('onMetadataChanged');
  }
}


describe('common/metadata', () => {

  describe('Metadata.Cursor', () => {

    let cursor: Metadata.ICursor;
    let value: JSONValue;

    beforeEach(() => {
      value = 'hi';
      cursor = new Metadata.Cursor({
        name: 'foo',
        read: name => {
          return value;
        },
        write: (name, newValue) => {
          value = newValue;
        }
      });
    });

    afterEach(() => {
      cursor.dispose();
    });

    describe('#constructor', () => {

      it('should create a metadata cursor', () => {
        expect(cursor).to.be.a(Metadata.Cursor);
      });

    });

    describe('#name', () => {

      it('should be the name of the metadata key', () => {
        expect(cursor.name).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the cursor is disposed', () => {
        expect(cursor.isDisposed).to.be(false);
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the cursor', () => {
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
      });

    });

    describe('#getValue()', () => {

      it('should get the value of the cursor data', () => {
        expect(cursor.getValue()).to.be('hi');
      });

    });

    describe('#setValue()', () => {

      it('should set the value of the cursor data', () => {
        cursor.setValue(1);
        expect(cursor.getValue()).to.be(1);
      });

    });

  });

  describe('Metadata.ChangeMessage', () => {

    describe('#constructor()', () => {

      it('should create a new message', () => {
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        expect(message).to.be.a(Metadata.ChangeMessage);
      });

    });

    describe('#args', () => {

      it('should be the args of the message', () => {
        let args: Metadata.ChangedArgs = {
          name: 'foo',
          oldValue: void 0,
          newValue: 'hi'
        };
        let message = new Metadata.ChangeMessage(args);
        expect(message.args).to.be(args);
      });

    });

  });

  describe('Metadata.Editor', () => {

    let editor: LogEditor;

    beforeEach(() => {
      editor = new LogEditor();
    });

    afterEach(() => {
      editor.dispose();
    });

    describe('#constructor', () => {

      it('should create a new metadata editor', () => {
        let newEditor = new Metadata.Editor();
        expect(newEditor).to.be.a(Metadata.Editor);
      });

    });

    describe('#textareaNode', () => {

      it('should be the text area used by the editor', () => {
        expect(editor.textareaNode.localName).to.be('textarea');
      });

    });

    describe('#revertButtonNode', () => {

      it('should be the revert button node used by the editor', () => {
        expect(editor.revertButtonNode.classList).to.contain('jp-MetadataEditor-revertButton');
      });

    });

    describe('#commitButtonNode', () => {

      it('should be the commit button node used by the editor', () => {
        expect(editor.commitButtonNode.classList).to.contain('jp-MetadataEditor-commitButton');
      });

    });

    describe('#owner', () => {

      it('should be the owner of the metadata', () => {
        expect(editor.owner).to.be(null);
      });

      it('should be settable', () => {
        let model = new RawCellModel({});
        editor.owner = model;
        expect(editor.owner).to.be(model);
      });

      it('should update the text area value', () => {
        let node = editor.textareaNode;
        expect(node.value).to.be('');
        let model = new RawCellModel({});
        editor.owner = model;
        expect(node.value).to.be('{}');
      });

    });

    describe('#isDirty', () => {

      it('should test whether the editor value is dirty', () => {
        expect(editor.isDirty).to.be(false);
        let node = editor.textareaNode;
        Widget.attach(editor, document.body);
        node.value = 'a';
        simulate(node, 'input');
        expect(editor.isDirty).to.be(true);
      });

      it('should be dirty if the value changes while focused', () => {
        editor.owner = new RawCellModel({});
        Widget.attach(editor, document.body);
        editor.textareaNode.focus();
        expect(editor.isDirty).to.be(false);
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        sendMessage(editor, message);
        expect(editor.isDirty).to.be(true);
      });

      it('should not be set if not focused', () => {
        Widget.attach(editor, document.body);
        expect(editor.isDirty).to.be(false);
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        sendMessage(editor, message);
        expect(editor.isDirty).to.be(false);
      });

    });

    describe('#processMessage()', () => {

      it('should handle metadata changed messages', () => {
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        editor.processMessage(message);
        expect(editor.methods).to.contain('onMetadataChanged');
      });

    });

    describe('#handleEvent()', () => {

      context('input', () => {

      });

      context('blur', () => {

      });

      context('click', () => {

      });

    });

    describe('#onAfterAttach()', () => {

    });

    describe('#onBeforeDetach()', () => {

    });

    describe('#onMetadataChanged', () => {

    });

  });

});
