// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  CompletionHandler,
  IInlineCompletionProvider,
  InlineCompleter
} from '@jupyterlab/completer';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { nullTranslator } from '@jupyterlab/translation';
import { framePromise, signalToPromise, simulate } from '@jupyterlab/testing';
import { Signal } from '@lumino/signaling';
import { createEditorWidget } from '@jupyterlab/completer/lib/testutils';
import { Widget } from '@lumino/widgets';
import { MessageLoop } from '@lumino/messaging';
import { Doc, Text } from 'yjs';
import type {
  CellChange,
  FileChange,
  ISharedText,
  SourceChange
} from '@jupyter/ydoc';

const GHOST_TEXT_CLASS = 'jp-GhostText';
const STREAMING_INDICATOR_CLASS = 'jp-GhostText-streamingIndicator';
const ERROR_INDICATOR_CLASS = 'jp-GhostText-errorIndicator';

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
    const findInHost = (selector: string) =>
      editorWidget.editor.host.querySelector(selector);

    beforeEach(() => {
      editorWidget = createEditorWidget();
      // Mock coordinate for position as jest does not implement layout
      editorWidget.editor.getCoordinateForPosition = () => {
        return { left: 0, top: 0, right: 0, bottom: 0 };
      };
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

      it('should set the cursor position at the same time as the completion suggestion', () => {
        model.setCompletions({
          items: suggestionsAbc
        });
        let editorPosition = editorWidget.editor.getCursorPosition();

        expect(editorPosition).toEqual({
          line: 0,
          column: 0
        });

        const onContentChange = (
          str: ISharedText,
          changed: SourceChange | CellChange | FileChange
        ) => {
          if (changed.sourceChange) {
            editorPosition = editorWidget.editor.getCursorPosition();
          }
        };
        editorWidget.editor.model.sharedModel.changed.connect(onContentChange);
        try {
          completer.accept();
        } finally {
          editorWidget.editor.model.sharedModel.changed.disconnect(
            onContentChange
          );
        }
        expect(editorPosition).toEqual({
          line: 0,
          column: 12
        });
      });

      it('should be undoable in one step', async () => {
        model.setCompletions({
          items: suggestionsAbc
        });
        completer.accept();
        const waitForChange = signalToPromise(
          editorWidget.editor.model.sharedModel.changed
        );
        editorWidget.editor.undo();
        await waitForChange;
        expect(editorWidget.editor.model.sharedModel.source).toBe('');
      });
    });

    describe('#_setText()', () => {
      it('should render the completion as it is streamed', async () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        const stream = new Signal<any, CompletionHandler.StraemEvent>(
          {} as any
        );
        const item: CompletionHandler.IInlineItem = {
          insertText: 'this',
          streaming: true,
          provider: exampleProvider,
          isIncomplete: true,
          stream
        };
        model.setCompletions({ items: [item] });
        await framePromise();

        stream.emit(CompletionHandler.StraemEvent.opened);

        let ghost = findInHost(`.${GHOST_TEXT_CLASS}`) as HTMLElement;
        let streamingIndicator = findInHost(`.${STREAMING_INDICATOR_CLASS}`);

        expect(ghost.innerText).toBe('this');
        expect(streamingIndicator).toBeDefined();

        item.insertText = 'this is';
        stream.emit(CompletionHandler.StraemEvent.update);
        expect(ghost.innerText).toBe('this is');

        item.insertText = 'this is a';
        stream.emit(CompletionHandler.StraemEvent.update);
        expect(ghost.innerText).toBe('this is a');

        item.insertText = 'this is a test';
        item.streaming = false;
        item.isIncomplete = false;
        stream.emit(CompletionHandler.StraemEvent.closed);

        const errorIndicator = findInHost(`.${ERROR_INDICATOR_CLASS}`);
        expect(ghost.innerText).toBe('this is a test');
        expect(errorIndicator).toBeNull();
        // On runtime streaming indicator gets removed because innerText gets called,
        // but behold jsdom which does not implement innerText as of 2024 and thus
        // setting innerText on an element does not clear its children in tests, see
        // https://github.com/jsdom/jsdom/issues/1245
        // streamingIndicator = findInHost(`.${STREAMING_INDICATOR_CLASS}`);
        // expect(streamingIndicator).toBeNull();
      });

      it('should render the error if stream errors out', async () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        const stream = new Signal<any, CompletionHandler.StraemEvent>(
          {} as any
        );
        const item: CompletionHandler.IInlineItem = {
          insertText: 'this',
          streaming: true,
          provider: exampleProvider,
          isIncomplete: true,
          stream
        };
        model.setCompletions({ items: [item] });
        await framePromise();

        stream.emit(CompletionHandler.StraemEvent.opened);

        let ghost = findInHost(`.${GHOST_TEXT_CLASS}`) as HTMLElement;
        let streamingIndicator = findInHost(`.${STREAMING_INDICATOR_CLASS}`);
        let errorIndicator = findInHost(`.${ERROR_INDICATOR_CLASS}`) as
          | HTMLElement
          | undefined;

        expect(ghost.innerText).toBe('this');
        expect(streamingIndicator).toBeDefined();
        expect(errorIndicator).toBeNull();

        item.insertText = 'this is';
        stream.emit(CompletionHandler.StraemEvent.update);

        item.error = { message: 'Completion generation failed' };
        stream.emit(CompletionHandler.StraemEvent.update);
        errorIndicator = findInHost(`.${ERROR_INDICATOR_CLASS}`) as HTMLElement;
        streamingIndicator = findInHost(`.${STREAMING_INDICATOR_CLASS}`);
        // should not remove suggestion
        expect(ghost.innerText).toBe('this is');
        // should show error indicator
        expect(errorIndicator).toBeDefined();
        // should hide streaming indicator
        expect(streamingIndicator).toBeNull();

        // the error indicator should include the title
        expect(errorIndicator.title).toBe('Completion generation failed');
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

      it('`maxLines` should limit the number of lines visible', async () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        completer.configure({
          ...InlineCompleter.defaultSettings,
          maxLines: 3
        });
        const item: CompletionHandler.IInlineItem = {
          ...itemDefaults,
          insertText: 'line1\nline2\nline3\nline4\nline5'
        };
        model.setCompletions({ items: [item] });

        const ghost = findInHost(`.${GHOST_TEXT_CLASS}`) as HTMLElement;
        expect(ghost.innerText).toBe('line1\nline2\nline3');
      });

      const getGhostTextContent = () => {
        const ghost = findInHost(`.${GHOST_TEXT_CLASS}`) as HTMLElement;
        // jest-dom does not support textContent/innerText properly, we need to extract it manually
        return (
          ghost.innerText +
          [...ghost.childNodes].map(node => node.textContent).join('')
        );
      };

      it('`minLines` should add empty lines when needed', async () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        completer.configure({
          ...InlineCompleter.defaultSettings,
          minLines: 3
        });
        const item: CompletionHandler.IInlineItem = {
          ...itemDefaults,
          insertText: 'line1'
        };
        model.setCompletions({ items: [item] });

        expect(getGhostTextContent()).toBe('line1\n\n');
      });

      it('`reserveSpaceForLongest` should add empty lines when needed', async () => {
        Widget.attach(editorWidget, document.body);
        Widget.attach(completer, document.body);
        completer.configure({
          ...InlineCompleter.defaultSettings,
          reserveSpaceForLongest: true
        });
        model.setCompletions({
          items: [
            {
              ...itemDefaults,
              insertText: 'line1'
            },
            {
              ...itemDefaults,
              insertText: 'line1\nline2\nline3'
            }
          ]
        });

        expect(getGhostTextContent()).toBe('line1\n\n');
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
