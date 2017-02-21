// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  simulate
} from 'simulate-event';

import {
  CodeMirrorEditorFactory
} from '../../../lib/codemirror';

import {
  IObservableJSON, ObservableJSON, ObservableJSONWidget
} from '../../../lib/common/observablejson';


class LogEditor extends ObservableJSONWidget {

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
}


describe('common/observablejson', () => {

  describe('ObservableJSON', () => {

    describe('#constructor()', () => {

      it('should create an observable JSON object', () => {
        let item = new ObservableJSON();
        expect(item).to.be.an(ObservableJSON);
      });

      it('should accept initial values', () => {
        let item = new ObservableJSON({
          values: { 'foo': 1, 'bar': 'baz'}
        });
        expect(item).to.be.an(ObservableJSON);
      });

    });

    describe('#toJSON()', () => {

      it('should serialize the model to JSON', () => {
        let item = new ObservableJSON();
        item.set('foo', 1);
        expect(item.toJSON()['foo']).to.be(1);
      });

      it('should return a copy of the data', () => {
        let item = new ObservableJSON();
        item.set('foo', { 'bar': 1 });
        let value = item.toJSON();
        value['bar'] = 2;
        expect((item.get('foo') as any)['bar']).to.be(1);
      });

    });

  });

  describe('ObservableJSON.ChangeMessage', () => {

    describe('#constructor()', () => {

      it('should create a new message', () => {
        let message = new ObservableJSON.ChangeMessage({
          key: 'foo',
          type: 'add',
          oldValue: 1,
          newValue: 2
        });
        expect(message).to.be.a(ObservableJSON.ChangeMessage);
      });

    });

    describe('#args', () => {

      it('should be the args of the message', () => {
        let args: IObservableJSON.IChangedArgs = {
          key: 'foo',
          type: 'add',
          oldValue: 'ho',
          newValue: 'hi'
        };
        let message = new ObservableJSON.ChangeMessage(args);
        expect(message.args).to.be(args);
      });

    });

  });

  describe('ObservableJSONWidget', () => {

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
        let newEditor = new ObservableJSONWidget({ editorFactory });
        expect(newEditor).to.be.a(ObservableJSONWidget);
      });

    });

    describe('#editorHostNode', () => {

      it('should be the editor host node used by the editor', () => {
        expect(editor.editorHostNode.classList).to.contain('jp-ObservableJSONWidget-host');
      });

    });

    describe('#revertButtonNode', () => {

      it('should be the revert button node used by the editor', () => {
        expect(editor.revertButtonNode.classList).to.contain('jp-ObservableJSONWidget-revertButton');
      });

    });

    describe('#commitButtonNode', () => {

      it('should be the commit button node used by the editor', () => {
        expect(editor.commitButtonNode.classList).to.contain('jp-ObservableJSONWidget-commitButton');
      });

    });

    describe('#source', () => {

      it('should be the source of the metadata', () => {
        expect(editor.source).to.be(null);
      });

      it('should be settable', () => {
        let source = new ObservableJSON();
        editor.source = source;
        expect(editor.source).to.be(source);
      });

      it('should update the text area value', () => {
        let model = editor.model;
        expect(model.value.text).to.be('No data!');
        editor.source = new ObservableJSON();
        expect(model.value.text).to.be('{}');
      });

    });

    describe('#isDirty', () => {

      it('should test whether the editor value is dirty', () => {
        expect(editor.isDirty).to.be(false);
        Widget.attach(editor, document.body);
        editor.model.value.text = 'a';
        expect(editor.isDirty).to.be(true);
      });

      it('should be dirty if the value changes while focused', () => {
        editor.source = new ObservableJSON();
        Widget.attach(editor, document.body);
        editor.editor.focus();
        expect(editor.isDirty).to.be(false);
        editor.source.set('foo', 1);
        expect(editor.isDirty).to.be(true);
      });

      it('should not be set if not focused', () => {
        editor.source = new ObservableJSON();
        Widget.attach(editor, document.body);
        expect(editor.isDirty).to.be(false);
        editor.source.set('foo', 1);
        expect(editor.isDirty).to.be(false);
      });

    });

    context('model.value.changed', () => {

      it('should add the error flag if invalid JSON', () => {
        editor.model.value.text = 'foo';
        expect(editor.hasClass('jp-mod-error')).to.be(true);
      });

      it('should show the commit button if the value has changed', () => {
        editor.model.value.text = '{"foo": 1}';
        expect(editor.commitButtonNode.hidden).to.be(false);
      });

      it('should not show the commit button if the value is invalid', () => {
        editor.model.value.text = 'foo';
        expect(editor.commitButtonNode.hidden).to.be(true);
      });

      it('should show the revert button if the value has changed', () => {
        editor.model.value.text = 'foo';
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
          editor.source = new ObservableJSON();
          editor.editor.focus();
          editor.source.set('foo', 1);
          let model = editor.model;
          expect(model.value.text).to.be('{}');
          simulate(editor.editorHostNode, 'blur');
          expect(model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should not revert to current data if there was a change', () => {
          editor.source = new ObservableJSON();
          editor.model.value.text = 'foo';
          editor.source.set('foo', 1);
          let model = editor.model;
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
          editor.source = new ObservableJSON();
          editor.model.value.text = 'foo';
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.value.text).to.be('{}');
        });

        it('should handle programmatic changes', () => {
          editor.source = new ObservableJSON();
          editor.model.value.text = 'foo';
          editor.source.set('foo', 1);
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should handle click events on the commit button', () => {
          simulate(editor.commitButtonNode, 'click');
          expect(editor.events).to.contain('click');
        });

        it('should bail if it is not valid JSON', () => {
          editor.source = new ObservableJSON();
          editor.model.value.text = 'foo';
          editor.source.set('foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('foo');
        });

        it('should override a key that was set programmatically', () => {
          editor.source = new ObservableJSON();
          editor.model.value.text = '{"foo": 2}';
          editor.source.set('foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 2\n}');
        });

        it('should allow a programmatic key to update', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.value.text = '{"foo":1, "bar": 2}';
          editor.source.set('foo', 2);
          simulate(editor.commitButtonNode, 'click');
          let expected = '{\n  "foo": 2,\n  "bar": 2\n}';
          expect(editor.model.value.text).to.be(expected);
        });

        it('should allow a key to be added by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.value.text = '{"foo":1, "bar": 2, "baz": 3}';
          editor.source.set('foo', 2);
          simulate(editor.commitButtonNode, 'click');
          let value = '{\n  "foo": 2,\n  "bar": 2,\n  "baz": 3\n}';
          expect(editor.model.value.text).to.be(value);
        });

        it('should allow a key to be removed by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.value.text = '{"foo": 1}';
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "foo": 1\n}');
        });

        it('should allow a key to be removed programmatically that was not set by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.value.text = '{"foo": 1, "bar": 3}';
          editor.source.set('foo', void 0);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.value.text).to.be('{\n  "bar": 3\n}');
        });

        it('should keep a key that was removed programmatically that was changed by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.value.text = '{"foo": 2, "bar": 3}';
          editor.source.set('foo', void 0);
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

    context('#source.changed', () => {

      it('should update the value', () => {
        editor.source = new ObservableJSON();
        editor.source.set('foo', 1);
        expect(editor.model.value.text).to.be('{\n  "foo": 1\n}');
      });

      it('should bail if the input is dirty', () => {
        Widget.attach(editor, document.body);
        editor.source = new ObservableJSON();
        editor.model.value.text = 'ha';
        editor.source.set('foo', 2);
        expect(editor.model.value.text).to.be('ha');
      });

      it('should bail if the input is focused', () => {
        Widget.attach(editor, document.body);
        editor.model.value.text = '{}';
        editor.source = new ObservableJSON();
        editor.editor.focus();
        editor.source.set('foo', 2);
        expect(editor.model.value.text).to.be('{}');
      });

    });

  });

});
