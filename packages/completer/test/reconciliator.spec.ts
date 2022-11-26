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
import { Context } from '@jupyterlab/docregistry';
import { INotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';
import { ServiceManager } from '@jupyterlab/services';
import { NBTestUtils } from '@jupyterlab/testutils';

function contextFactory(): Context<INotebookModel> {
  const serviceManager = new ServiceManager({ standby: 'never' });
  const factory = new NotebookModelFactory({
    disableDocumentWideUndoRedo: false
  });
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
const DEFAULT_REPLY = {
  start: 3,
  end: 3,
  items: [
    { label: 'fooModule', type: 'module' },
    { label: 'barFunction', type: 'function' }
  ]
};
class FooCompletionProvider implements ICompletionProvider {
  identifier: string = SAMPLE_PROVIDER_ID;
  renderer = null;
  async fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    await new Promise(r => setTimeout(r, 500));
    return Promise.resolve(DEFAULT_REPLY);
  }
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return true;
  }
  shouldShowContinuousHint(completerIsVisible: boolean, changed: any) {
    return true;
  }
}

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
          context: { widget },
          providers: [fooProvider1, fooProvider2],
          timeout: 1000
        });
        void reconciliator.fetch({ offset: 0, text: '' });
        expect(fooProvider1.fetch).toBeCalled();
        expect(fooProvider2.fetch).toBeCalled();
      });
      it('should include `resolve` to reply items', async () => {
        const fooProvider1 = new FooCompletionProvider();
        const reconciliator = new ProviderReconciliator({
          context: { widget },
          providers: [fooProvider1],
          timeout: 1000
        });
        const res = await reconciliator.fetch({ offset: 0, text: '' });
        expect(res!['items']).toEqual([
          { label: 'fooModule', resolve: undefined, type: 'module' },
          { label: 'barFunction', resolve: undefined, type: 'function' }
        ]);
      });
      it('should reject slow fetch request', async () => {
        const fooProvider1 = new FooCompletionProvider();
        const reconciliator = new ProviderReconciliator({
          context: { widget },
          providers: [fooProvider1],
          timeout: 200
        });
        const res = await reconciliator.fetch({ offset: 0, text: '' });
        expect(res).toEqual(null);
      });
      it('should check the `shouldShowContinuousHint` of the first provider', async () => {
        const fooProvider1 = new FooCompletionProvider();
        fooProvider1.shouldShowContinuousHint = jest.fn();
        const fooProvider2 = new FooCompletionProvider();
        fooProvider2.shouldShowContinuousHint = jest.fn();
        const reconciliator = new ProviderReconciliator({
          context: { widget },
          providers: [fooProvider1, fooProvider1],
          timeout: 200
        });
        reconciliator.shouldShowContinuousHint(true, null as any);
        expect(fooProvider1.shouldShowContinuousHint).toBeCalledTimes(1);
        expect(fooProvider2.shouldShowContinuousHint).toBeCalledTimes(0);
      });
    });
  });
});
