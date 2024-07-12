// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, JSONEditor } from '@jupyterlab/codeeditor';
import { ObservableJSON } from '@jupyterlab/observables';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

class LogEditor extends JSONEditor {
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

  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.methods.push('onAfterShow');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }
}

describe('codeeditor', () => {
  describe('JSONEditor', () => {
    let editor: LogEditor;
    const editorFactory: CodeEditor.Factory = ({ model }) => {
      let _hasFocus = false;
      return {
        dispose: jest.fn(),
        focus: () => {
          _hasFocus = true;
        },
        hasFocus: () => _hasFocus,
        model,
        refresh: jest.fn(),
        setCursorPosition: jest.fn(),
        setOption: jest.fn()
      } as any;
    };

    beforeEach(() => {
      editor = new LogEditor({ editorFactory });
    });

    afterEach(() => {
      editor.dispose();
    });

    describe('#constructor', () => {
      it('should create a new metadata editor', () => {
        const newEditor = new JSONEditor({ editorFactory });
        expect(newEditor).toBeInstanceOf(JSONEditor);
      });
    });

    describe('#headerNode', () => {
      it('should be the header node used by the editor', () => {
        expect(Array.from(editor.headerNode.classList)).toEqual(
          expect.arrayContaining(['jp-JSONEditor-header'])
        );
      });
    });

    describe('#editorHostNode', () => {
      it('should be the editor host node used by the editor', () => {
        expect(Array.from(editor.editorHostNode.classList)).toEqual(
          expect.arrayContaining(['jp-JSONEditor-host'])
        );
      });
    });

    describe('#revertButtonNode', () => {
      it('should be the revert button node used by the editor', () => {
        expect(
          editor.revertButtonNode.querySelector("[data-icon$='undo']")
        ).toBeDefined();
      });
    });

    describe('#commitButtonNode', () => {
      it('should be the commit button node used by the editor', () => {
        expect(
          editor.commitButtonNode.querySelector("[data-icon$='check']")
        ).toBeDefined();
      });
    });

    describe('#source', () => {
      it('should be the source of the metadata', () => {
        expect(editor.source).toBe(null);
      });

      it('should be settable', () => {
        const source = new ObservableJSON();
        editor.source = source;
        expect(editor.source).toBe(source);
      });

      it('should update the text area value', () => {
        const model = editor.model;
        expect(model.sharedModel.getSource()).toBe('');
        editor.source = new ObservableJSON();
        expect(model.sharedModel.getSource()).toBe('{}');
      });
    });

    describe('#isDirty', () => {
      it('should test whether the editor value is dirty', () => {
        expect(editor.isDirty).toBe(false);
        Widget.attach(editor, document.body);
        editor.model.sharedModel.setSource('a');
        expect(editor.isDirty).toBe(true);
      });

      it('should be dirty if the value changes while focused', () => {
        editor.source = new ObservableJSON();
        Widget.attach(editor, document.body);
        editor.editor.focus();
        expect(editor.isDirty).toBe(false);
        editor.source.set('foo', 1);
        expect(editor.isDirty).toBe(true);
      });

      it('should not be set if not focused', () => {
        editor.source = new ObservableJSON();
        Widget.attach(editor, document.body);
        expect(editor.isDirty).toBe(false);
        editor.source.set('foo', 1);
        expect(editor.isDirty).toBe(false);
      });
    });

    describe('model.value.changed', () => {
      it('should add the error flag if invalid JSON', () => {
        editor.model.sharedModel.setSource('foo');
        expect(editor.hasClass('jp-mod-error')).toBe(true);
      });

      it('should show the commit button if the value has changed', () => {
        editor.model.sharedModel.setSource('{"foo": 2}');
        editor.model.sharedModel.setSource('{"foo": 1}');
        expect(editor.commitButtonNode.hidden).toBe(false);
      });

      it('should not show the commit button if the value is invalid', () => {
        editor.model.sharedModel.setSource('foo');
        expect(editor.commitButtonNode.hidden).toBe(true);
      });

      it('should show the revert button if the value has changed', () => {
        editor.model.sharedModel.setSource('foo');
        expect(editor.revertButtonNode.hidden).toBe(false);
      });
    });

    describe('#handleEvent()', () => {
      beforeEach(() => {
        Widget.attach(editor, document.body);
      });

      describe('blur', () => {
        it('should handle blur events on the host node', () => {
          editor.editor.focus();
          simulate(editor.editorHostNode, 'blur');
          expect(editor.events).toEqual(expect.arrayContaining(['blur']));
        });

        it('should revert to current data if there was no change', () => {
          editor.source = new ObservableJSON();
          editor.editor.focus();
          editor.source.set('foo', 1);
          const model = editor.model;
          expect(model.sharedModel.getSource()).toBe('{}');
          simulate(editor.editorHostNode, 'blur');
          expect(model.sharedModel.getSource()).toBe('{\n    "foo": 1\n}');
        });

        it('should not revert to current data if there was a change', () => {
          editor.source = new ObservableJSON();
          editor.model.sharedModel.setSource('foo');
          editor.source.set('foo', 1);
          const model = editor.model;
          expect(model.sharedModel.getSource()).toBe('foo');
          simulate(editor.editorHostNode, 'blur');
          expect(model.sharedModel.getSource()).toBe('foo');
          expect(editor.commitButtonNode.hidden).toBe(true);
          expect(editor.revertButtonNode.hidden).toBe(false);
        });
      });

      describe('click', () => {
        it('should handle click events on the revert button', () => {
          simulate(editor.revertButtonNode, 'click');
          expect(editor.events).toEqual(expect.arrayContaining(['click']));
        });

        it('should revert the current data', () => {
          editor.source = new ObservableJSON();
          editor.model.sharedModel.setSource('foo');
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe('{}');
        });

        it('should handle programmatic changes', () => {
          editor.source = new ObservableJSON();
          editor.model.sharedModel.setSource('foo');
          editor.source.set('foo', 1);
          simulate(editor.revertButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe(
            '{\n    "foo": 1\n}'
          );
        });

        it('should handle click events on the commit button', () => {
          simulate(editor.commitButtonNode, 'click');
          expect(editor.events).toEqual(expect.arrayContaining(['click']));
        });

        it('should bail if it is not valid JSON', () => {
          editor.source = new ObservableJSON();
          editor.model.sharedModel.setSource('foo');
          editor.source.set('foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe('foo');
        });

        it('should override a key that was set programmatically', () => {
          editor.source = new ObservableJSON();
          editor.model.sharedModel.setSource('{"foo": 2}');
          editor.source.set('foo', 1);
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe(
            '{\n    "foo": 2\n}'
          );
        });

        it('should allow a programmatic key to update', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.sharedModel.setSource('{"foo":1, "bar": 2}');
          editor.source.set('foo', 2);
          simulate(editor.commitButtonNode, 'click');
          const expected = '{\n    "foo": 2,\n    "bar": 2\n}';
          expect(editor.model.sharedModel.getSource()).toBe(expected);
        });

        it('should allow a key to be added by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.sharedModel.setSource('{"foo":1, "bar": 2, "baz": 3}');
          editor.source.set('foo', 2);
          simulate(editor.commitButtonNode, 'click');
          const value = '{\n    "foo": 2,\n    "bar": 2,\n    "baz": 3\n}';
          expect(editor.model.sharedModel.getSource()).toBe(value);
        });

        it('should allow a key to be removed by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.sharedModel.setSource('{"foo": 1}');
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe(
            '{\n    "foo": 1\n}'
          );
        });

        it('should allow a key to be removed programmatically that was not set by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.sharedModel.setSource('{"foo": 1, "bar": 3}');
          editor.source.delete('foo');
          simulate(editor.commitButtonNode, 'click');
          expect(editor.model.sharedModel.getSource()).toBe(
            '{\n    "bar": 3\n}'
          );
        });

        it('should keep a key that was removed programmatically that was changed by the user', () => {
          editor.source = new ObservableJSON();
          editor.source.set('foo', 1);
          editor.source.set('bar', 1);
          editor.model.sharedModel.setSource('{"foo": 2, "bar": 3}');
          editor.source.set('foo', null);
          simulate(editor.commitButtonNode, 'click');
          const expected = '{\n    "foo": 2,\n    "bar": 3\n}';
          expect(editor.model.sharedModel.getSource()).toBe(expected);
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should add event listeners', () => {
        Widget.attach(editor, document.body);
        expect(editor.methods).toEqual(
          expect.arrayContaining(['onAfterAttach'])
        );
        editor.editor.focus();
        simulate(editor.editorHostNode, 'blur');
        simulate(editor.revertButtonNode, 'click');
        simulate(editor.commitButtonNode, 'click');
        expect(editor.events).toEqual(['blur', 'click', 'click']);
      });
    });

    describe('#onBeforeDetach()', () => {
      it('should remove event listeners', () => {
        Widget.attach(editor, document.body);
        Widget.detach(editor);
        expect(editor.methods).toEqual(
          expect.arrayContaining(['onBeforeDetach'])
        );
        editor.editor.focus();
        simulate(editor.editorHostNode, 'blur');
        simulate(editor.revertButtonNode, 'click');
        simulate(editor.commitButtonNode, 'click');
        expect(editor.events).toEqual([]);
      });
    });

    describe('#source.changed', () => {
      it('should update the value', () => {
        editor.source = new ObservableJSON();
        editor.source.set('foo', 1);
        expect(editor.model.sharedModel.getSource()).toBe('{\n    "foo": 1\n}');
      });

      it('should bail if the input is dirty', () => {
        Widget.attach(editor, document.body);
        editor.source = new ObservableJSON();
        editor.model.sharedModel.setSource('ha');
        editor.source.set('foo', 2);
        expect(editor.model.sharedModel.getSource()).toBe('ha');
      });

      it('should bail if the input is focused', () => {
        Widget.attach(editor, document.body);
        editor.model.sharedModel.setSource('{}');
        editor.source = new ObservableJSON();
        editor.editor.focus();
        editor.source.set('foo', 2);
        expect(editor.model.sharedModel.getSource()).toBe('{}');
      });
    });
  });
});
