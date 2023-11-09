// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  CompletionHandler,
  IInlineCompletionProvider,
  InlineCompleter
} from '@jupyterlab/completer';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { nullTranslator } from '@jupyterlab/translation';
import { simulate } from '@jupyterlab/testing';
import { Signal } from '@lumino/signaling';
import { createEditorWidget } from '@jupyterlab/completer/lib/testutils';
import { Widget } from '@lumino/widgets';
import { MessageLoop } from '@lumino/messaging';
import { Doc, Text } from 'yjs';

describe('completer/inline', () => {
  const exampleProvider: IInlineCompletionProvider = {
    name: 'An inline provider',
    identifier: 'inline-provider',
    fetch: async _request => {
      return {
        items: [itemDefaults]
      };
    }
  };
  const itemDefaults: CompletionHandler.IInlineItem = {
    insertText: 'test',
    streaming: false,
    provider: exampleProvider,
    stream: new Signal({} as any)
  };

  describe('InlineCompleter', () => {
    let completer: InlineCompleter;
    let editorWidget: CodeEditorWrapper;
    let model: InlineCompleter.Model;
    let suggestionsAbc: CompletionHandler.IInlineItem[];

    beforeEach(() => {
      editorWidget = createEditorWidget();
      model = new InlineCompleter.Model();
      model.cursor = {
        line: 0,
        column: 0
      };
      completer = new InlineCompleter({
        editor: editorWidget.editor,
        model,
        trans: nullTranslator.load('test')
      });
      model.cursor = editorWidget.editor.getPositionAt(0)!;
      suggestionsAbc = [
        {
          ...itemDefaults,
          insertText: 'suggestion a'
        },
        {
          ...itemDefaults,
          insertText: 'suggestion b'
        },
        {
          ...itemDefaults,
          insertText: 'suggestion c'
        }
      ];
    });

    describe('#accept()', () => {
      it('should update editor source', () => {
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.accept();
        expect(editorWidget.editor.model.sharedModel.source).toBe(
          'suggestion a'
        );
      });
    });

    describe('#current', () => {
      it('preserves active completion when results change order', () => {
        Widget.attach(completer, document.body);
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion c');
        model.setCompletions({
          items: suggestionsAbc.slice().reverse()
        });
        expect(completer.current?.insertText).toBe('suggestion c');
      });

      it('switches to a first item if the previous current has disappeared', () => {
        Widget.attach(completer, document.body);
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion c');
        model.setCompletions({
          items: [
            {
              ...itemDefaults,
              insertText: 'suggestion b'
            }
          ]
        });
        expect(completer.current?.insertText).toBe('suggestion b');
      });

      it('preserves active completion when prefix is typed', () => {
        Widget.attach(completer, document.body);
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion c');
        model.handleTextChange({ sourceChange: [{ insert: 'sugg' }] });
        expect(completer.current?.insertText).toBe('estion c');
      });

      it('discards when a non-prefix is typed', () => {
        Widget.attach(completer, document.body);
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion c');
        model.handleTextChange({ sourceChange: [{ insert: 'not a prefix' }] });
        expect(completer.current).toBe(null);
      });
    });

    describe('#configure()', () => {
      it('should update widget class to reflect display preference', () => {
        expect(completer.node.dataset.display).toBe('onHover');
        completer.configure({
          ...InlineCompleter.defaultSettings,
          showWidget: 'always'
        });
        expect(completer.node.dataset.display).toBe('always');
      });

      it('should update widget class to reflect shortcut display preference', () => {
        expect(completer.node.dataset.showShortcuts).toBe('true');
        completer.configure({
          ...InlineCompleter.defaultSettings,
          showShortcuts: false
        });
        expect(completer.node.dataset.showShortcuts).toBe('false');
      });
    });

    describe('#cycle()', () => {
      it('should cycle forward with "next"', () => {
        model.setCompletions({
          items: suggestionsAbc
        });
        expect(completer.current?.insertText).toBe('suggestion a');
        completer.cycle('next');
        expect(completer.current?.insertText).toBe('suggestion b');
        completer.cycle('next');
        expect(completer.current?.insertText).toBe('suggestion c');
        completer.cycle('next');
        expect(completer.current?.insertText).toBe('suggestion a');
      });

      it('should cycle backward with "previous"', () => {
        model.setCompletions({
          items: suggestionsAbc
        });
        expect(completer.current?.insertText).toBe('suggestion a');
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion c');
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion b');
        completer.cycle('previous');
        expect(completer.current?.insertText).toBe('suggestion a');
      });
    });

    describe('#handleEvent()', () => {
      it('hides completer on pointer down', () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        model.setCompletions({ items: suggestionsAbc });
        MessageLoop.sendMessage(completer, Widget.Msg.UpdateRequest);
        expect(completer.isHidden).toBe(false);
        simulate(editorWidget.node, 'pointerdown');
        MessageLoop.sendMessage(completer, Widget.Msg.UpdateRequest);
        expect(completer.isHidden).toBe(true);
      });

      it('does not hide when pointer clicks on the widget', () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        model.setCompletions({ items: suggestionsAbc });
        MessageLoop.sendMessage(completer, Widget.Msg.UpdateRequest);
        expect(completer.isHidden).toBe(false);
        simulate(completer.node, 'pointerdown');
        MessageLoop.sendMessage(completer, Widget.Msg.UpdateRequest);
        expect(completer.isHidden).toBe(false);
      });
    });
  });

  describe('InlineCompleter.Model', () => {
    let editorWidget: CodeEditorWrapper;
    let model: InlineCompleter.Model;
    let options: CompletionHandler.IInlineItem[];
    let ytext: Text;

    beforeEach(() => {
      editorWidget = createEditorWidget();
      model = new InlineCompleter.Model();
      model.cursor = {
        line: 0,
        column: 0
      };
      model.cursor = editorWidget.editor.getPositionAt(0)!;
      options = [
        {
          ...itemDefaults,
          insertText: 'suggestion a'
        },
        {
          ...itemDefaults,
          insertText: 'text b'
        },
        {
          ...itemDefaults,
          insertText: 'option c'
        }
      ];
      const ydoc = new Doc();
      ytext = ydoc.getText();
    });

    describe('#setCompletions()', () => {
      it('should emit `suggestionsChanged` signal', () => {
        const callback = jest.fn();
        model.suggestionsChanged.connect(callback);
        expect(callback).toHaveBeenCalledTimes(0);
        model.setCompletions({ items: options });
        expect(callback).toHaveBeenCalledTimes(1);
        model.suggestionsChanged.disconnect(callback);
      });
      it('should set completions', () => {
        model.setCompletions({ items: options });
        expect(model.completions?.items).toHaveLength(3);
      });
      it('should override existing completions', () => {
        model.setCompletions({ items: options });
        model.setCompletions({ items: options });
        expect(model.completions?.items).toHaveLength(3);
      });
    });

    describe('#appendCompletions()', () => {
      it('should emit `suggestionsChanged` signal', () => {
        const callback = jest.fn();
        model.setCompletions({ items: options });
        model.suggestionsChanged.connect(callback);
        expect(callback).toHaveBeenCalledTimes(0);
        model.appendCompletions({ items: options });
        expect(callback).toHaveBeenCalledTimes(1);
        model.suggestionsChanged.disconnect(callback);
      });
      it('should append completions', () => {
        model.setCompletions({ items: options });
        model.appendCompletions({ items: options });
        expect(model.completions?.items).toHaveLength(6);
      });
    });

    describe('#handleTextChange()', () => {
      it('should emit `filterTextChanged` signal', () => {
        const callback = jest.fn();
        model.filterTextChanged.connect(callback);
        model.setCompletions({ items: options });
        expect(callback).toHaveBeenCalledTimes(0);
        ytext.insert(0, 'test');
        model.handleTextChange({ sourceChange: ytext.toDelta() });
        expect(callback).toHaveBeenCalledTimes(1);
        model.filterTextChanged.disconnect(callback);
      });
      it('should filter by prefix', () => {
        model.setCompletions({ items: options });
        ytext.insert(0, 'text');
        model.handleTextChange({ sourceChange: ytext.toDelta() });
        expect(model.completions?.items).toHaveLength(1);
        expect(model.completions?.items[0].insertText).toBe(' b');
      });
      it('should nullify completions on prefix mismatch', () => {
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        ytext.insert(0, 'insertion');
        model.handleTextChange({ sourceChange: ytext.toDelta() });
        expect(model.completions).toBeNull();
      });
      it('should nullify completions on backspace/deletion', () => {
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        model.handleTextChange({ sourceChange: [{ delete: 1 }] });
        expect(model.completions).toBeNull();
      });
    });

    describe('#handleSelectionChange()', () => {
      it('should reset on cursor moving to a different line', () => {
        model.cursor = { line: 0, column: 0 };
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        const secondLine = { line: 1, column: 0 };
        model.handleSelectionChange({ start: secondLine, end: secondLine });
        expect(model.completions).toBeNull();
      });

      it('should reset on cursor moving backwards in the same line', () => {
        model.cursor = { line: 0, column: 5 };
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        const oneBack = { line: 0, column: 4 };
        model.handleSelectionChange({ start: oneBack, end: oneBack });
        expect(model.completions).toBeNull();
      });

      it('should reset on character selection', () => {
        model.cursor = { line: 0, column: 5 };
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        model.handleSelectionChange({
          start: { line: 0, column: 5 },
          end: { line: 0, column: 6 }
        });
        expect(model.completions).toBeNull();
      });

      it('should reset on line selection', () => {
        model.cursor = { line: 0, column: 5 };
        model.setCompletions({ items: options });
        expect(model.completions).toBeTruthy();
        model.handleSelectionChange({
          start: { line: 0, column: 5 },
          end: { line: 1, column: 5 }
        });
        expect(model.completions).toBeNull();
      });
    });
  });
});
