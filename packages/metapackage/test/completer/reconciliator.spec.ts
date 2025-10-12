/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  CompletionHandler,
  ICompletionContext,
  ICompletionProvider,
  ProviderReconciliator
} from '@jupyterlab/completer';
import { createEditorWidget } from '@jupyterlab/completer/lib/testutils';
import { Context } from '@jupyterlab/docregistry';
import { INotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';
import { ServiceManager } from '@jupyterlab/services';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';

function contextFactory(): Context<INotebookModel> {
  const serviceManager = new ServiceManager({ standby: 'never' });
  const factory = new NotebookModelFactory();
  const context = new Context({
    manager: serviceManager,
    factory,
    path: 'foo.ipynb',
    kernelPreference: {
      shouldStart: false,
      canStart: false,
      shutdownOnDispose: true,
      name: 'default'
    }
  });
  return context;
}
const widget = NBTestUtils.createNotebookPanel(contextFactory());

const SAMPLE_PROVIDER_ID = 'CompletionProvider:sample';
const DEFAULT_DELAY = 0;
const DEFAULT_REPLY = {
  start: 3,
  end: 3,
  items: [
    { label: 'fooModule', type: 'module' },
    { label: 'barFunction', type: 'function' }
  ]
};

class FooCompletionProvider implements ICompletionProvider {
  constructor(
    protected options: {
      reply?: CompletionHandler.ICompletionItemsReply;
      delay?: number;
      reject?: boolean;
    } = {}
  ) {
    // no-op
  }
  identifier: string = SAMPLE_PROVIDER_ID;
  renderer = null;
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    await new Promise(r => setTimeout(r, this.options.delay ?? DEFAULT_DELAY));
    if (this.options.reject) {
      return Promise.reject();
    } else {
      return Promise.resolve(this.options.reply ?? DEFAULT_REPLY);
    }
  }
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return true;
  }
  shouldShowContinuousHint(completerIsVisible: boolean, changed: any) {
    return true;
  }
}

const defaultOptions = {
  context: { widget },
  timeout: 1000
};

describe('completer/reconciliator', () => {
  describe('ProviderReconciliator', () => {
    describe('#constructor()', () => {
      it('should create a provider reconciliator', () => {
        const reconciliator = new ProviderReconciliator({
          context: { widget },
          providers: [],
          timeout: 0
        });
        expect(reconciliator).toBeInstanceOf(ProviderReconciliator);
      });
    });
    describe('#fetch()', () => {
      it('should call `fetch` of all providers', async () => {
        const mock = jest.fn();
        mock.mockResolvedValue({ items: [] });
        const fooProvider1 = new FooCompletionProvider();
        fooProvider1.fetch = mock;
        const fooProvider2 = new FooCompletionProvider();
        fooProvider2.fetch = mock;
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [fooProvider1, fooProvider2]
        });
        await reconciliator.fetch({ offset: 0, text: '' });
        expect(fooProvider1.fetch).toHaveBeenCalled();
        expect(fooProvider2.fetch).toHaveBeenCalled();
      });
      it('should de-duplicate completions from multiple providers', async () => {
        const provider1 = new FooCompletionProvider();
        const provider2 = new FooCompletionProvider();
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [provider1, provider2]
        });
        const result = await reconciliator.fetch({ offset: 0, text: '' });
        expect(result).toEqual(DEFAULT_REPLY);
      });
      it('should de-duplicate by insert text if labels differ', async () => {
        const reply1 = {
          start: 3,
          end: 3,
          items: [
            { label: 'function1()', insertText: 'function1' },
            { label: 'function2()', insertText: 'function2' }
          ]
        };
        const reply2 = {
          start: 3,
          end: 3,
          items: [
            { label: 'function1', insertText: 'function1' },
            { label: 'function2', insertText: 'function2' }
          ]
        };
        const provider1 = new FooCompletionProvider({ reply: reply1 });
        const provider2 = new FooCompletionProvider({ reply: reply2 });
        let reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [provider1, provider2]
        });
        const request = { offset: 0, text: '' };
        let result = await reconciliator.fetch(request);
        expect(result).toEqual(reply1);
        reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [provider2, provider1]
        });
        result = await reconciliator.fetch(request);
        expect(result).toEqual(reply2);
      });
      it('should ignore flanking whitespaces for de-duplication', async () => {
        const replyWithSpace = {
          start: 3,
          end: 3,
          items: [{ label: 'import', insertText: 'import ' }]
        };
        const replyWithoutSpace = {
          start: 3,
          end: 3,
          items: [{ label: 'import', insertText: 'import' }]
        };
        const provider1 = new FooCompletionProvider({ reply: replyWithSpace });
        const provider2 = new FooCompletionProvider({
          reply: replyWithoutSpace
        });
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [provider1, provider2]
        });
        const result = await reconciliator.fetch({ offset: 0, text: '' });
        expect(result).toEqual(replyWithSpace);
      });

      it('should remove prefix when reply starts in the first line', async () => {
        const reply1 = {
          start: 4,
          end: 6,
          items: [{ label: '.fromkeys' }]
        };
        const reply2 = {
          start: 5,
          end: 6,
          items: [{ label: 'foo' }]
        };
        const provider1 = new FooCompletionProvider({ reply: reply1 });
        const provider2 = new FooCompletionProvider({ reply: reply2 });
        const editor = createEditorWidget();
        editor.model.sharedModel.setSource('dict.f\nfoo');
        let reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          context: {
            ...defaultOptions.context,
            editor: editor.editor
          },
          providers: [provider1, provider2]
        });
        const request = {
          offset: 6,
          text: editor.model.sharedModel.getSource()
        };
        let result = await reconciliator.fetch(request);
        expect(result).toEqual({
          start: 5,
          end: 6,
          items: [
            { label: '.fromkeys', insertText: 'fromkeys', resolve: undefined },
            { label: 'foo', resolve: undefined }
          ]
        });
      });

      it('should remove prefix when reply starts in a subsequent line', async () => {
        const reply1 = {
          start: 12,
          end: 14,
          items: [{ label: '.fromkeys' }]
        };
        const reply2 = {
          start: 13,
          end: 14,
          items: [{ label: 'foo' }]
        };
        const provider1 = new FooCompletionProvider({ reply: reply1 });
        const provider2 = new FooCompletionProvider({ reply: reply2 });
        const editor = createEditorWidget();
        editor.model.sharedModel.setSource('foo = 0\ndict.f');
        editor.editor.setCursorPosition({ line: 1, column: 6 });
        let reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          context: {
            ...defaultOptions.context,
            editor: editor.editor
          },
          providers: [provider1, provider2]
        });
        const request = {
          offset: 14,
          text: editor.model.sharedModel.getSource()
        };
        let result = await reconciliator.fetch(request);
        expect(result).toEqual({
          start: 13,
          end: 14,
          items: [
            { label: '.fromkeys', insertText: 'fromkeys', resolve: undefined },
            { label: 'foo', resolve: undefined }
          ]
        });
      });

      it('should return completions even if one of providers fails', async () => {
        const provider1 = new FooCompletionProvider();
        const provider2 = new FooCompletionProvider({ reject: true });
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [provider1, provider2]
        });
        const result = await reconciliator.fetch({ offset: 0, text: '' });
        expect(result).toEqual(DEFAULT_REPLY);
      });
      it('should include `resolve` in reply items', async () => {
        const fooProvider1 = new FooCompletionProvider();
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [fooProvider1]
        });
        const res = await reconciliator.fetch({ offset: 0, text: '' });
        expect(res!['items']).toEqual([
          { label: 'fooModule', resolve: undefined, type: 'module' },
          { label: 'barFunction', resolve: undefined, type: 'function' }
        ]);
      });
      it('should reject slow fetch request', async () => {
        const fooProvider1 = new FooCompletionProvider({ delay: 500 });
        const reconciliator = new ProviderReconciliator({
          context: { widget },
          providers: [fooProvider1],
          timeout: 200
        });
        const res = await reconciliator.fetch({ offset: 0, text: '' });
        expect(res).toEqual(null);
      });
    });
    describe('#shouldShowContinuousHint()', () => {
      it('should check the `shouldShowContinuousHint` of the first provider', async () => {
        const fooProvider1 = new FooCompletionProvider();
        fooProvider1.shouldShowContinuousHint = jest.fn();
        const fooProvider2 = new FooCompletionProvider();
        fooProvider2.shouldShowContinuousHint = jest.fn();
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [fooProvider1, fooProvider2]
        });
        await reconciliator.shouldShowContinuousHint(true, null as any);
        expect(fooProvider1.shouldShowContinuousHint).toHaveBeenCalledTimes(1);
        expect(fooProvider2.shouldShowContinuousHint).toHaveBeenCalledTimes(0);
      });
    });
    describe('#applicableProviders()', () => {
      it('should call `isApplicable` of all providers', async () => {
        const fooProvider1 = new FooCompletionProvider();
        const spy1 = jest.spyOn(fooProvider1, 'isApplicable');
        const fooProvider2 = new FooCompletionProvider();
        const spy2 = jest.spyOn(fooProvider2, 'isApplicable');
        const reconciliator = new ProviderReconciliator({
          ...defaultOptions,
          providers: [fooProvider1, fooProvider2]
        });
        const applicableProvides = await reconciliator['applicableProviders']();
        expect(spy1).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(applicableProvides).toEqual(
          expect.arrayContaining([fooProvider1, fooProvider2])
        );
        spy1.mockRestore();
        spy2.mockRestore();
      });
    });
  });
});
