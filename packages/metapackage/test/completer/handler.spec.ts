// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { Signal } from '@lumino/signaling';
import {
  Completer,
  CompleterModel,
  CompletionHandler,
  CompletionTriggerKind,
  ICompletionContext,
  ICompletionProvider,
  ProviderReconciliator
} from '@jupyterlab/completer';
import { createEditorWidget } from '@jupyterlab/completer/lib/testutils';
import { Widget } from '@lumino/widgets';
import { ISharedFile, ISharedText, SourceChange } from '@jupyter/ydoc';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';

class TestCompleterModel extends CompleterModel {
  methods: string[] = [];

  createPatch(patch: string): Completer.IPatch | undefined {
    this.methods.push('createPatch');
    return super.createPatch(patch);
  }

  handleTextChange(change: Completer.ITextState): void {
    this.methods.push('handleTextChange');
    super.handleTextChange(change);
  }
}

class TestCompletionHandler extends CompletionHandler {
  methods: string[] = [];

  async onTextChanged(str: ISharedText, changed: SourceChange): Promise<void> {
    void super.onTextChanged(str, changed);
    this.methods.push('onTextChanged');
  }

  onCompletionSelected(widget: Completer, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}

class FooCompletionProvider implements ICompletionProvider {
  triggers: CompletionTriggerKind[] = [];

  constructor(private _continuousHint: boolean) {}

  identifier: string = 'FooCompletionProvider';
  renderer = null;

  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return true;
  }

  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext,
    trigger: CompletionTriggerKind
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    this.triggers.push(trigger);
    return Promise.resolve({ start: 0, end: 0, items: [] });
  }

  shouldShowContinuousHint(
    completerIsVisible: boolean,
    changed: SourceChange,
    context?: ICompletionContext
  ) {
    return this._continuousHint;
  }
}

describe('@jupyterlab/completer', () => {
  let reconciliator: ProviderReconciliator;
  let sessionContext: ISessionContext;

  beforeAll(async () => {
    sessionContext = await createSessionContext();
    await (sessionContext as SessionContext).initialize();
    reconciliator = new ProviderReconciliator({
      context: null as any,
      providers: null as any,
      timeout: 0
    });
  });

  afterAll(() => sessionContext.shutdown());

  describe('CompletionHandler', () => {
    describe('#constructor()', () => {
      it('should create a completer handler', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        expect(handler).toBeInstanceOf(CompletionHandler);
      });
    });

    describe('#editor', () => {
      it('should default to null', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        expect(handler.editor).toBeNull();
      });

      it('should be settable', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        const widget = createEditorWidget();
        expect(handler.editor).toBeNull();
        handler.editor = widget.editor;
        expect(handler.editor).toBe(widget.editor);
      });

      it('should be resettable', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        const one = createEditorWidget();
        const two = createEditorWidget();
        expect(handler.editor).toBeNull();
        handler.editor = one.editor;
        expect(handler.editor).toBe(one.editor);
        handler.editor = two.editor;
        expect(handler.editor).toBe(two.editor);
      });

      it('should remove the completer active and enabled classes of the old editor', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        const widget = createEditorWidget();
        handler.editor = widget.editor;
        widget.toggleClass('jp-mod-completer-enabled');
        widget.toggleClass('jp-mod-completer-active');
        handler.editor = null;
        expect(widget.hasClass('jp-mod-completer-enabled')).toBe(false);
        expect(widget.hasClass('jp-mod-completer-active')).toBe(false);
      });
    });

    describe('#isDisposed', () => {
      it('should be true if handler has been disposed', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the handler resources', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const handler = new CompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#onTextChanged()', () => {
      it('should fire when the active editor emits a text change', () => {
        const handler = new TestCompletionHandler({
          reconciliator,
          completer: new Completer({ editor: null })
        });
        handler.editor = createEditorWidget().editor;
        expect(handler.methods).toEqual(
          expect.not.arrayContaining(['onTextChanged'])
        );
        handler.editor.model.sharedModel.setSource('foo');
        expect(handler.methods).toEqual(
          expect.arrayContaining(['onTextChanged'])
        );
      });

      it('should call model change handler if model exists', () => {
        const completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        const handler = new TestCompletionHandler({ completer, reconciliator });
        const editor = createEditorWidget().editor;
        const model = completer.model as TestCompleterModel;

        handler.editor = editor;
        expect(model.methods).toEqual(
          expect.not.arrayContaining(['handleTextChange'])
        );
        editor.model.sharedModel.setSource('bar');
        editor.setCursorPosition({ line: 0, column: 2 });
        (
          editor.model.sharedModel.changed as Signal<ISharedText, SourceChange>
        ).emit({ sourceChange: {} as any });
        expect(model.methods).toEqual(
          expect.arrayContaining(['handleTextChange'])
        );
      });
    });

    describe('#onCompletionSelected()', () => {
      it('should fire when the completer widget emits a signal', () => {
        const completer = new Completer({ editor: null });
        const handler = new TestCompletionHandler({ completer, reconciliator });

        expect(handler.methods).toEqual(
          expect.not.arrayContaining(['onCompletionSelected'])
        );
        (completer.selected as any).emit('foo');
        expect(handler.methods).toEqual(
          expect.arrayContaining(['onCompletionSelected'])
        );
      });

      it('should call model create patch method if model exists', () => {
        const completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        const handler = new TestCompletionHandler({ completer, reconciliator });
        const model = completer.model as TestCompleterModel;

        handler.editor = createEditorWidget().editor;
        expect(model.methods).toEqual(
          expect.not.arrayContaining(['createPatch'])
        );
        (completer.selected as any).emit('foo');
        expect(model.methods).toEqual(expect.arrayContaining(['createPatch']));
      });

      it('should update cell if patch exists', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const completer = new Completer({ editor: null, model });
        const handler = new TestCompletionHandler({ completer, reconciliator });
        const editor = createEditorWidget().editor;
        const text = 'eggs\nfoo # comment\nbaz';
        const want = 'eggs\nfoobar # comment\nbaz';
        const line = 1;
        const column = 5; // this sets the cursor after the "#" sign - not in the mid of the replaced word
        const request: Completer.ITextState = {
          column,
          line,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text
        };

        handler.editor = editor;
        handler.editor.model.sharedModel.setSource(text);
        handler.editor.setCursorPosition({ line, column: column + 3 });
        model.original = request;
        model.cursor = { start: column, end: column + 3 };
        (completer.selected as any).emit(patch);
        expect(handler.editor.model.sharedModel.getSource()).toBe(want);
        expect(handler.editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
      });

      it('should be undoable and redoable', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const completer = new Completer({ editor: null, model });
        const handler = new TestCompletionHandler({ completer, reconciliator });
        const editor = createEditorWidget().editor;
        const text = 'eggs\nfoo # comment\nbaz';
        const want = 'eggs\nfoobar # comment\nbaz';
        const line = 1;
        const column = 5;
        const request: Completer.ITextState = {
          column,
          line,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text
        };

        handler.editor = editor;
        handler.editor.model.sharedModel.setSource(text);
        handler.editor.model.sharedModel.clearUndoHistory();
        handler.editor.setCursorPosition({ line, column: column + 3 });
        model.original = request;
        model.cursor = { start: column, end: column + 3 };
        // Make the completion, check its value and cursor position.
        (completer.selected as any).emit(patch);
        expect(editor.model.sharedModel.getSource()).toBe(want);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
        // Undo the completion, check its value and cursor position.
        editor.undo();
        expect(editor.model.sharedModel.getSource()).toBe(text);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 3
        });
        // Redo the completion, check its value and cursor position.
        editor.redo();
        expect(editor.model.sharedModel.getSource()).toBe(want);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
      });
    });

    describe('#autoCompletion', () => {
      let anchor: CodeEditorWrapper;
      let provider: FooCompletionProvider;
      let handler: CompletionHandler;
      let context: symbol;

      beforeAll(async () => {
        anchor = createEditorWidget();
        Widget.attach(anchor, document.body);
        context = Symbol();

        provider = new FooCompletionProvider(true);
        handler = new CompletionHandler({
          reconciliator: new ProviderReconciliator({
            context: context as any,
            providers: [provider],
            timeout: 0
          }),
          completer: new Completer({
            editor: null,
            model: new CompleterModel()
          })
        });

        handler.editor = anchor.editor;
        handler.autoCompletion = true;
      });

      afterAll(() => {
        anchor.dispose();
        handler.completer.dispose();
        handler.dispose();
      });

      it('should use Invoked for invoke()', async () => {
        expect(provider.triggers.length).toEqual(0);

        handler.editor!.model.sharedModel.setSource('foo.');
        anchor.node.focus();
        await new Promise(process.nextTick);
        expect(provider.triggers.length).toEqual(1);
        anchor.editor.setCursorPosition({ line: 0, column: 4 });
        handler.invoke();
        // Need to wait for next tick to finish applicable providers check
        await new Promise(process.nextTick);
        expect(provider.triggers).toEqual(
          expect.arrayContaining([CompletionTriggerKind.Invoked])
        );
      });

      it('should use TriggerCharacter for typed text', async () => {
        // this test depends on the previous one ('should use Invoked for invoke()').
        expect(provider.triggers.length).toEqual(2);

        handler.editor!.model.sharedModel.updateSource(4, 4, 'a');
        await new Promise(process.nextTick);
        expect(provider.triggers.length).toEqual(3);
        expect(provider.triggers).toEqual(
          expect.arrayContaining([CompletionTriggerKind.TriggerCharacter])
        );
      });

      it('should not trigger on non-source changes to the model', async () => {
        provider.triggers.length = 0;

        (handler.editor!.model.sharedModel as ISharedFile).setState(
          'state-variable',
          'new-value'
        );
        await new Promise(process.nextTick);

        expect(provider.triggers.length).toEqual(0);
      });

      it('should pass context to `shouldShowContinuousHint()`', async () => {
        handler.editor!.model.sharedModel.setSource('foo.');
        await new Promise(process.nextTick);
        anchor.node.focus();
        anchor.editor.setCursorPosition({ line: 0, column: 4 });
        const spy = jest.spyOn(provider, 'shouldShowContinuousHint');

        handler.editor!.model.sharedModel.updateSource(4, 4, 'a');
        await new Promise(process.nextTick);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenLastCalledWith(
          false,
          {
            sourceChange: [{ retain: 4 }, { insert: 'a' }]
          } as SourceChange,
          context
        );
        spy.mockRestore();
      });
    });

    it('should update cursor position after autocomplete on empty word', () => {
      const model = new CompleterModel();
      const patch = 'foobar';
      const completer = new Completer({ editor: null, model });
      const handler = new TestCompletionHandler({ completer, reconciliator });
      const editor = createEditorWidget().editor;
      const text = 'eggs\n  # comment\nbaz';
      const want = 'eggs\n foobar # comment\nbaz';
      const line = 1;
      const column = 1;
      const request: Completer.ITextState = {
        column: column,
        line,
        lineHeight: 0,
        charWidth: 0,
        coords: null,
        text
      };

      handler.editor = editor;
      handler.editor.model.sharedModel.setSource(text);
      handler.editor.model.sharedModel.clearUndoHistory();
      handler.editor.setCursorPosition({ line, column });
      model.original = request;
      const offset = handler.editor.getOffsetAt({ line, column });
      model.cursor = { start: offset, end: offset };
      // Make the completion, check its value and cursor position.
      (completer.selected as any).emit(patch);
      expect(editor.model.sharedModel.getSource()).toBe(want);
      expect(editor.getCursorPosition()).toEqual({
        line,
        column: column + 6
      });
    });
  });
});
