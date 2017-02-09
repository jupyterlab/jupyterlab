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
  CodeMirrorEditorFactory
} from '../../../lib/codemirror';

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


/**
 * Set a programmatic on a metdata editor.
 */
function setValue(editor: Metadata.Editor, name: string, value: JSONValue): void {
  let cursor = editor.owner.getMetadata(name);
  cursor.setValue(value);
  let message = new Metadata.ChangeMessage({
    name: name,
    oldValue: void 0,
    newValue: value
  });
  editor.processMessage(message);
}

/**
 * Set an input value on a metadata editor.
 */
function setInput(editor: Metadata.Editor, value: string): void {
  editor.editor.model.value.text = value;
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
    const editorFactory = new CodeMirrorEditorFactory().newInlineEditor;

    beforeEach(() => {
      editor = new LogEditor({ editorFactory });
    });

    afterEach(() => {
      editor.dispose();
    });

    describe('#constructor', () => {

      it('should create a new metadata editor', () => {
        let newEditor = new Metadata.Editor({ editorFactory });
        expect(newEditor).to.be.a(Metadata.Editor);
      });

    });

    describe('#editorHostNode', () => {

      it('should be the editor host node used by the editor', () => {
        expect(editor.editorHostNode.classList).to.contain('jp-MetadataEditor-host');
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
        let model = editor.editor.model;
        expect(model.value.text).to.be('No data!');
        editor.owner = new RawCellModel({});
        expect(model.value.text).to.be('{}');
      });

    });

    describe('#isDirty', () => {

      it('should test whether the editor value is dirty', () => {
        expect(editor.isDirty).to.be(false);
        Widget.attach(editor, document.body);
        editor.editor.model.value.text = 'a';
        expect(editor.isDirty).to.be(true);
      });

      it('should be dirty if the value changes while focused', () => {
        editor.owner = new RawCellModel({});
        Widget.attach(editor, document.body);
        editor.editor.focus();
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

    context('model.value.changed', () => {

      it('should add the error flag if invalid JSON', () => {
        setInput(editor, 'foo');
        expect(editor.hasClass('jp-mod-error')).to.be(true);
      });

      it('should show the commit button if the value has changed', () => {
        setInput(editor, '{"foo": 1}');
        expect(editor.commitButtonNode.hidden).to.be(false);
      });

      it('should not show the commit button if the value is invalid', () => {
        setInput(editor, 'foo');
        expect(editor.commitButtonNode.hidden).to.be(true);
      });

      it('should show the revert button if the value has changed', () => {
        setInput(editor, 'foo');
        expect(editor.revertButtonNode.hidden).to.be(false);
      });

    });

    describe('#handleEvent()', () => {

      beforeEach(() => {
        Widget.attach(editor, document.body);
      });

      context('blur', () => {

        it('should handle blur events on the host node', () => {
          editor.editor.focus();
          simulate(editor.editorHostNode, 'blur');
          expect(editor.events).to.contain('blur');
        });

        it('should revert to current data if there was no change', () => {
          editor.owner = new RawCellModel({});
          editor.editor.focus();
          setValue(editor, 'foo', 1);
          let model = editor.editor.model;
          expect(model.value.text).to.be('{}');
          simulate(editor.editorHostNode, 'blur');
          expect(model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should not revert to current data if there was a change', () => {
          editor.owner = new RawCellModel({});
          setInput(editor, 'foo');
          setValue(editor, 'foo', 1);
          let model = editor.editor.model;
          expect(model.value.text).to.be('foo');
          simulate(editor.editorHostNode, 'blur');
          expect(model.value.text).to.be('foo');
          expect(editor.commitButtonNode.hidden).to.be(true);
          expect(editor.revertButtonNode.hidden).to.be(false);
        });

      });

      context('click', () => {

        it('should handle click events on the revert button', () => {
          simulate(editor.revertButtonNode, 'click');
          expect(editor.events).to.contain('click');
        });

        it('should revert the current data', () => {
          editor.owner = new RawCellModel({});
          setInput(editor, 'foo');
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.value.text).to.be('{}');
        });

        it('should handle programmatic changes', () => {
          editor.owner = new RawCellModel({});
          setInput(editor, 'foo');
          setValue(editor, 'foo', 1);
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should handle click events on the commit button', () => {
          simulate(editor.commitButtonNode, 'click');
          expect(editor.events).to.contain('click');
        });

        it('should bail if it is not valid JSON', () => {
          editor.owner = new RawCellModel({});
          setInput(editor, 'foo');
          setValue(editor, 'foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('foo');
        });

        it('should override a key that was set programmatically', () => {
          editor.owner = new RawCellModel({});
          setInput(editor, '{"foo": 2}');
          setValue(editor, 'foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 2\n}');
        });

        it('should allow a programmatic key to update', () => {
          editor.owner = new RawCellModel({});
          setValue(editor, 'foo', 1);
          setValue(editor, 'bar', 1);
          setInput(editor, '{"foo":1, "bar": 2}');
          setValue(editor, 'foo', 2);
          simulate(editor.commitButtonNode, 'click');
          let expected = '{\n  "foo": 2,\n  "bar": 2\n}';
          expect(editor.model.value.text).to.be(expected);
        });

        it('should allow a key to be added by the user', () => {
          editor.owner = new RawCellModel({});
          setValue(editor, 'foo', 1);
          setValue(editor, 'bar', 1);
          setInput(editor, '{"foo":1, "bar": 2, "baz": 3}');
          setValue(editor, 'foo', 2);
          simulate(editor.commitButtonNode, 'click');
          let value = '{\n  "foo": 2,\n  "bar": 2,\n  "baz": 3\n}';
          expect(editor.model.value.text).to.be(value);
        });

        it('should allow a key to be removed by the user', () => {
          editor.owner = new RawCellModel({});
          setValue(editor, 'foo', 1);
          setValue(editor, 'bar', 1);
          setInput(editor, '{"foo": 1}');
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should allow a key to be removed programmatically that was not set by the user', () => {
          editor.owner = new RawCellModel({});
          setValue(editor, 'foo', 1);
          setValue(editor, 'bar', 1);
          setInput(editor, '{"foo": 1, "bar": 3}');
          setValue(editor, 'foo', void 0);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "bar": 3\n}');
        });

        it('should keep a key that was removed programmatically that was changed by the user', () => {
          editor.owner = new RawCellModel({});
          setValue(editor, 'foo', 1);
          setValue(editor, 'bar', 1);
          setInput(editor, '{"foo": 2, "bar": 3}');
          setValue(editor, 'foo', void 0);
          simulate(editor.commitButtonNode, 'click');
          let expected = '{\n  "foo": 2,\n  "bar": 3\n}';
          expect(editor.model.value.text).to.be(expected);
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners', () => {
        Widget.attach(editor, document.body);
        expect(editor.methods).to.contain('onAfterAttach');
        editor.editor.focus();
        simulate(editor.editorHostNode, 'blur');
        simulate(editor.revertButtonNode, 'click');
        simulate(editor.commitButtonNode, 'click');
        expect(editor.events).to.eql(['blur', 'click', 'click']);
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', () => {
        Widget.attach(editor, document.body);
        Widget.detach(editor);
        expect(editor.methods).to.contain('onBeforeDetach');
        editor.editor.focus();
        simulate(editor.editorHostNode, 'blur');
        simulate(editor.revertButtonNode, 'click');
        simulate(editor.commitButtonNode, 'click');
        expect(editor.events).to.eql([]);
      });

    });

    describe('#onMetadataChanged', () => {

      it('should update the value', () => {
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        editor.processMessage(message);
        expect(editor.methods).to.contain('onMetadataChanged');
        expect(editor.model.value.text).to.be('No data!');
      });

      it('should bail if the input is dirty', () => {
        Widget.attach(editor, document.body);
        let model = new RawCellModel({});
        editor.owner = model;
        setInput(editor, 'ha');
        let cursor = model.getMetadata('foo');
        cursor.setValue(2);
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        editor.processMessage(message);
        expect(editor.methods).to.contain('onMetadataChanged');
        expect(editor.model.value.text).to.be('ha');
      });

      it('should bail if the input is focused', () => {
        Widget.attach(editor, document.body);
        setInput(editor, '{}');
        let model = new RawCellModel({});
        editor.owner = model;
        let cursor = model.getMetadata('foo');
        cursor.setValue(2);
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        editor.editor.focus();
        editor.processMessage(message);
        expect(editor.methods).to.contain('onMetadataChanged');
        expect(editor.model.value.text).to.be('{}');
      });

    });

  });

});
