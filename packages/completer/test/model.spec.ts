// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Completer,
  CompleterModel,
  CompletionHandler
} from '@jupyterlab/completer';

function makeState(text: string): Completer.ITextState {
  return {
    column: 0,
    lineHeight: 0,
    charWidth: 0,
    line: 0,
    coords: { left: 0, right: 0, top: 0, bottom: 0 },
    text
  };
}

describe('completer/model', () => {
  describe('CompleterModel', () => {
    describe('#constructor()', () => {
      it('should create a completer model', () => {
        const model = new CompleterModel();
        expect(model).toBeInstanceOf(CompleterModel);
        expect(model.setCompletionItems).toBeDefined();
      });
    });

    describe('#stateChanged', () => {
      it('should signal when model items have changed', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.setCompletionItems([{ label: 'foo' }]);
        expect(called).toBe(1);
        model.setCompletionItems([{ label: 'foo' }]);
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        expect(called).toBe(2);
      });

      it('should not signal when items have not changed', () => {
        let model = new CompleterModel();
        let called = 0;
        let listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.setCompletionItems([{ label: 'foo' }]);
        model.setCompletionItems([{ label: 'foo' }]);
        expect(called).toBe(1);
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        expect(called).toBe(2);
        model.setCompletionItems([]);
        model.setCompletionItems([]);
        expect(called).toBe(3);
        const itemsWithResolve = [
          {
            label: 'foo',
            resolve: async () => {
              return { label: 'foo', documentation: 'Foo docs' };
            }
          }
        ];
        model.setCompletionItems(itemsWithResolve);
        model.setCompletionItems(itemsWithResolve);
        expect(called).toBe(4);
      });

      it('should signal when original request changes', () => {
        const model = new CompleterModel();
        let called = 0;
        const listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.original = makeState('foo');
        expect(called).toBe(1);
        model.original = null;
        expect(called).toBe(2);
      });

      it('should not signal when original request has not changed', () => {
        const model = new CompleterModel();
        let called = 0;
        const listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.original = makeState('foo');
        model.original = makeState('foo');
        expect(called).toBe(1);
        model.original = null;
        model.original = null;
        expect(called).toBe(2);
      });

      it('should signal when current text changes', () => {
        const model = new CompleterModel();
        let called = 0;
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        const listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.original = request;
        expect(called).toBe(1);
        model.cursor = cursor;
        model.current = change;
        expect(called).toBe(2);
        model.current = null;
        expect(called).toBe(3);
      });

      it('should not signal when current text is unchanged', () => {
        const model = new CompleterModel();
        let called = 0;
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        const listener = (sender: any, args: void) => {
          called++;
        };
        model.stateChanged.connect(listener);
        expect(called).toBe(0);
        model.original = request;
        expect(called).toBe(1);
        model.cursor = cursor;
        model.current = change;
        model.current = change;
        expect(called).toBe(2);
        model.current = null;
        model.current = null;
        expect(called).toBe(3);
      });
    });

    describe('#queryChanged', () => {
      it('should signal when query is set via public setter', () => {
        const model = new CompleterModel();
        let called: Record<'setter' | 'editorUpdate' | 'reset', number> = {
          setter: 0,
          editorUpdate: 0,
          reset: 0
        };
        const listener = (sender: any, args: Completer.IQueryChange) => {
          called[args.origin]++;
        };
        model.queryChanged.connect(listener);
        expect(called.setter).toBe(0);
        model.query = 'foo';
        expect(called.setter).toBe(1);
        model.query = 'bar';
        expect(called.setter).toBe(2);
        expect(called.editorUpdate).toBe(0);
      });

      it('should signal when query gets reset', () => {
        const model = new CompleterModel();
        let called: Record<'setter' | 'editorUpdate' | 'reset', number> = {
          setter: 0,
          editorUpdate: 0,
          reset: 0
        };
        const listener = (sender: any, args: Completer.IQueryChange) => {
          called[args.origin]++;
        };
        model.queryChanged.connect(listener);
        expect(called.reset).toBe(0);
        model.query = 'foo';
        expect(called.reset).toBe(0);
        model.reset();
        expect(called.reset).toBe(1);
        // Should not call again (query does not change with second reset)
        model.reset();
        expect(called.reset).toBe(1);
      });

      it('should signal when current text changes', () => {
        const model = new CompleterModel();
        let called: Record<'setter' | 'editorUpdate' | 'reset', number> = {
          setter: 0,
          editorUpdate: 0,
          reset: 0
        };
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        const listener = (sender: any, args: Completer.IQueryChange) => {
          called[args.origin]++;
        };
        model.queryChanged.connect(listener);
        expect(called.editorUpdate).toBe(0);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(called.editorUpdate).toBe(1);
      });

      it('should not signal when current text is unchanged', () => {
        const model = new CompleterModel();
        let called: Record<'setter' | 'editorUpdate' | 'reset', number> = {
          setter: 0,
          editorUpdate: 0,
          reset: 0
        };
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        const listener = (sender: any, args: Completer.IQueryChange) => {
          called[args.origin]++;
        };
        model.queryChanged.connect(listener);
        expect(called.editorUpdate).toBe(0);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        model.current = change;
        expect(called.editorUpdate).toBe(1);
      });
    });

    describe('#completionItems()', () => {
      it('should default to { items: [] }', () => {
        let model = new CompleterModel();
        let want: CompletionHandler.ICompletionItems = [];
        expect(model.completionItems()).toEqual(want);
      });

      it('should return unmarked ICompletionItems if query is blank', () => {
        let model = new CompleterModel();
        let want: CompletionHandler.ICompletionItems = [
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ];
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ]);
        expect(model.completionItems()).toEqual(want);
      });

      it('should return a marked list of items if query is set', () => {
        let model = new CompleterModel();
        let want = '<mark>f</mark>oo';
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ]);
        model.query = 'f';
        expect(model.completionItems().length).toEqual(1);
        expect(model.completionItems()[0].label).toEqual(want);
      });

      it('should order list based on score', () => {
        const model = new CompleterModel();
        const want: CompletionHandler.ICompletionItems = [
          { insertText: 'qux', label: '<mark>qux</mark>' },
          { insertText: 'quux', label: '<mark>qu</mark>u<mark>x</mark>' }
        ];
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' },
          { label: 'quux' },
          { label: 'qux' }
        ]);
        model.query = 'qux';
        expect(model.completionItems()).toEqual(want);
      });

      it('should break ties in score by locale sort', () => {
        const model = new CompleterModel();
        const want: CompletionHandler.ICompletionItems = [
          { insertText: 'quux', label: '<mark>qu</mark>ux' },
          { insertText: 'qux', label: '<mark>qu</mark>x' }
        ];
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' },
          { label: 'quux' },
          { label: 'qux' }
        ]);
        model.query = 'qu';
        expect(model.completionItems()).toEqual(want);
      });

      it('should return { items: [] } if reset', () => {
        let model = new CompleterModel();
        let want: CompletionHandler.ICompletionItems = [];
        model.setCompletionItems([
          { label: 'foo' },
          { label: 'bar' },
          { label: 'baz' }
        ]);
        model.reset();
        expect(model.completionItems()).toEqual(want);
      });

      it('should escape HTML markup', () => {
        let model = new CompleterModel();
        let want: CompletionHandler.ICompletionItems = [
          {
            label: '&lt;foo&gt;&lt;/foo&gt;',
            insertText: '<foo></foo>'
          }
        ];
        model.setCompletionItems([{ label: '<foo></foo>' }]);
        expect(model.completionItems()).toEqual(want);
      });

      it('should escape HTML with matches markup', () => {
        let model = new CompleterModel();
        let want: CompletionHandler.ICompletionItems = [
          {
            label: '&lt;foo&gt;<mark>smi</mark>le&lt;/foo&gt;',
            insertText: '<foo>smile</foo>'
          }
        ];
        model.setCompletionItems([{ label: '<foo>smile</foo>' }]);
        model.query = 'smi';
        expect(model.completionItems()).toEqual(want);
      });
    });

    describe('#original', () => {
      it('should default to null', () => {
        const model = new CompleterModel();
        expect(model.original).toBeNull();
      });

      it('should return the original request', () => {
        const model = new CompleterModel();
        const request = makeState('foo');
        model.original = request;
        expect(model.original).toBe(request);
      });
    });

    describe('#current', () => {
      it('should default to null', () => {
        const model = new CompleterModel();
        expect(model.current).toBeNull();
      });

      it('should initially equal the original request', () => {
        const model = new CompleterModel();
        const request = makeState('foo');
        model.original = request;
        expect(model.current).toBe(request);
      });

      it('should not set if original request is nonexistent', () => {
        const model = new CompleterModel();
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        model.current = change;
        expect(model.current).toBeNull();
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).toBe(change);
      });

      it('should not set if cursor is nonexistent', () => {
        const model = new CompleterModel();
        const currentValue = 'foo';
        const newValue = 'foob';
        const request = makeState(currentValue);
        const change = makeState(newValue);
        model.original = request;
        model.cursor = null;
        model.current = change;
        expect(model.current).not.toBe(change);
      });

      it('should reset model if change is shorter than original', () => {
        const model = new CompleterModel();
        const currentValue = 'foo';
        const newValue = 'fo';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        model.original = request;
        model.cursor = cursor;
        model.current = change;
        expect(model.current).toBeNull();
        expect(model.original).toBeNull();
      });
    });

    describe('#cursor', () => {
      it('should default to null', () => {
        const model = new CompleterModel();
        expect(model.cursor).toBeNull();
      });

      it('should not set if original request is nonexistent', () => {
        const model = new CompleterModel();
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState('foo');
        model.cursor = cursor;
        expect(model.cursor).toBeNull();
        model.original = request;
        model.cursor = cursor;
        expect(model.cursor).toBe(cursor);
      });
    });

    describe('#isDisposed', () => {
      it('should be true if model has been disposed', () => {
        const model = new CompleterModel();
        expect(model.isDisposed).toBe(false);
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the model resources', () => {
        const model = new CompleterModel();
        model.setCompletionItems([{ label: 'foo' }]);
        expect(model.isDisposed).toBe(false);
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const model = new CompleterModel();
        expect(model.isDisposed).toBe(false);
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#handleTextChange()', () => {
      it('should set current change value', () => {
        const model = new CompleterModel();
        const currentValue = 'foo';
        const newValue = 'foob';
        const cursor: Completer.ICursorSpan = { start: 0, end: 0 };
        const request = makeState(currentValue);
        const change = makeState(newValue);
        (change as any).column = 4;
        model.original = request;
        model.cursor = cursor;
        expect(model.current).toBe(request);
        model.handleTextChange(change);
        expect(model.current).toBe(change);
      });

      it('should reset if last char is whitespace && column < original', () => {
        const model = new CompleterModel();
        const currentValue = 'foo';
        const newValue = 'foo ';
        const request = makeState(currentValue);
        (request as any).column = 3;
        const change = makeState(newValue);
        (change as any).column = 0;
        model.original = request;
        expect(model.original).toBe(request);
        model.handleTextChange(change);
        expect(model.original).toBeNull();
      });
    });

    describe('#createPatch()', () => {
      it('should return a patch value', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const want: Completer.IPatch = {
          start: 0,
          end: 3,
          value: patch
        };
        const cursor: Completer.ICursorSpan = { start: 0, end: 3 };
        model.original = makeState('foo');
        model.cursor = cursor;
        expect(model.createPatch(patch)).toEqual(want);
      });

      it('should return undefined if original request or cursor are null', () => {
        const model = new CompleterModel();
        expect(model.createPatch('foo')).toBeUndefined();
      });

      it('should handle line breaks in original value', () => {
        const model = new CompleterModel();
        const currentValue = 'foo\nbar';
        const patch = 'barbaz';
        const start = currentValue.length;
        const end = currentValue.length;
        const want: Completer.IPatch = {
          start,
          end,
          value: patch
        };
        const cursor: Completer.ICursorSpan = { start, end };
        model.original = makeState(currentValue);
        model.cursor = cursor;
        expect(model.createPatch(patch)).toEqual(want);
      });
    });
    describe('#resolveItem()', () => {
      it('should return `undefined` if the completion item list is empty.', () => {
        const model = new CompleterModel();
        expect(model.resolveItem(0)).toBeUndefined();
      });

      it('should return undefined if item index is out of range.', () => {
        const model = new CompleterModel();
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        expect(model.resolveItem(3)).toBeUndefined();
      });
      it('should return the original item if `resolve` is missing.', async () => {
        const model = new CompleterModel();
        model.setCompletionItems([{ label: 'foo' }, { label: 'bar' }]);
        const resolved = await model.resolveItem(0);
        expect(resolved).toEqual({ label: 'foo' });
      });
      it('should resolve by index missing fields and remove the `resolve` function itself', async () => {
        const model = new CompleterModel();
        const item = {
          label: 'foo',
          resolve: () =>
            Promise.resolve({ label: 'foo', documentation: 'Foo docs' })
        };
        model.setCompletionItems([item]);
        const resolved = await model.resolveItem(0);
        expect(resolved).toEqual({ label: 'foo', documentation: 'Foo docs' });
        expect(item).toEqual({
          label: 'foo',
          documentation: 'Foo docs',
          resolve: undefined
        });
      });
      it('should resolve by value missing fields and remove the `resolve` function itself', async () => {
        const model = new CompleterModel();
        const item = {
          label: 'foo',
          resolve: () =>
            Promise.resolve({ label: 'foo', documentation: 'Foo docs' })
        };
        const resolved = await model.resolveItem(item);
        expect(resolved).toEqual({ label: 'foo', documentation: 'Foo docs' });
        expect(item).toEqual({
          label: 'foo',
          documentation: 'Foo docs',
          resolve: undefined
        });
      });
      it('should cancel pending resolution', async () => {
        const model = new CompleterModel();
        const item1 = {
          label: 'foo',
          resolve: async () => {
            await new Promise(r => setTimeout(r, 100));
            return { label: 'foo', documentation: 'Foo docs' };
          }
        };
        const item2 = {
          label: 'bar',
          resolve: async () => {
            await new Promise(r => setTimeout(r, 100));
            return { label: 'bar', documentation: 'Bar docs' };
          }
        };
        model.setCompletionItems([item1, item2]);
        const first = model.resolveItem(item1);
        const second = model.resolveItem(item2);
        expect(await first).toEqual(null);
        expect(await second).toEqual({
          label: 'bar',
          documentation: 'Bar docs'
        });
      });
      it('should escape HTML markup', async () => {
        let model = new CompleterModel();
        const item = {
          label: '<foo></foo>',
          resolve: () =>
            Promise.resolve({ label: '<foo></foo>', documentation: 'Foo docs' })
        };
        model.setCompletionItems([item]);
        const resolved = await model.resolveItem(0);
        expect(resolved).toEqual({
          label: '&lt;foo&gt;&lt;/foo&gt;',
          insertText: '<foo></foo>',
          documentation: 'Foo docs',
          resolve: undefined
        });
      });
    });
  });
});
