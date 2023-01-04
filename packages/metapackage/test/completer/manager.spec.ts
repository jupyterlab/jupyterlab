// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { Cell, CellModel } from '@jupyterlab/cells';
import {
  Completer,
  CompleterModel,
  CompletionHandler,
  CompletionProviderManager,
  ContextCompleterProvider,
  ICompletionContext,
  ICompletionProvider,
  ProviderReconciliator
} from '@jupyterlab/completer';
import { Context } from '@jupyterlab/docregistry';
import { INotebookModel, NotebookModelFactory } from '@jupyterlab/notebook';
import { ServiceManager } from '@jupyterlab/services';
import { createStandaloneCell } from '@jupyter/ydoc';

import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';

const DEFAULT_PROVIDER_ID = 'CompletionProvider:context';
const SAMPLE_PROVIDER_ID = 'CompletionProvider:sample';

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

class TestCellModel extends CellModel {
  get type(): string {
    return 'code';
  }
}

class CustomCompleterModel extends CompleterModel {}

class FooCompletionProvider implements ICompletionProvider {
  identifier: string = SAMPLE_PROVIDER_ID;
  renderer = null;
  fetch(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<CompletionHandler.ICompletionItemsReply> {
    return Promise.resolve({
      start: 3,
      end: 3,
      items: [
        { label: 'fooModule', type: 'module' },
        { label: 'barFunction', type: 'function' }
      ]
    });
  }
  async isApplicable(context: ICompletionContext): Promise<boolean> {
    return true;
  }

  async modelFactory(context: ICompletionContext): Promise<Completer.IModel> {
    return new CustomCompleterModel();
  }
}

describe('completer/manager', () => {
  let sessionContext: ISessionContext;
  let manager: CompletionProviderManager;

  beforeAll(async () => {
    sessionContext = await createSessionContext();
    await (sessionContext as SessionContext).initialize();
  });

  afterAll(() => sessionContext.shutdown());

  beforeEach(() => {
    manager = new CompletionProviderManager();
    manager.registerProvider(new ContextCompleterProvider());
    manager.activateProvider(['CompletionProvider:context']);
  });

  describe('CompletionProviderManager', () => {
    describe('#constructor()', () => {
      it('should create a manager', () => {
        expect(manager).toBeInstanceOf(CompletionProviderManager);
      });
    });

    describe('#generateReconciliator()', () => {
      it('should create a ProviderReconciliator', async () => {
        const reconciliator = await manager['generateReconciliator']({
          session: sessionContext.session,
          editor: null
        });
        expect(reconciliator).toBeInstanceOf(ProviderReconciliator);
        expect(reconciliator['_providers'].length).toBe(1);
      });
    });

    describe('#registerProvider()', () => {
      it('should register a new provider', () => {
        manager.registerProvider(new FooCompletionProvider());
        expect(manager.getProviders().size).toBe(2);
      });
      it('should not register a provider twice', () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.registerProvider(new FooCompletionProvider());
        expect(manager.getProviders().size).toBe(2);
      });
    });

    describe('#activateProvider()', () => {
      it('should have jupyterlab provider by default', () => {
        expect(manager['_activeProviders'].size).toBe(1);
        expect(manager['_activeProviders'].has(DEFAULT_PROVIDER_ID)).toBe(true);
      });
      it('should activate requested provider', () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.activateProvider([SAMPLE_PROVIDER_ID]);
        expect(manager['_activeProviders'].size).toBe(1);
        expect(manager['_activeProviders'].has(DEFAULT_PROVIDER_ID)).toBe(
          false
        );
        expect(manager['_activeProviders'].has(SAMPLE_PROVIDER_ID)).toBe(true);
      });
      it('should activate multiple providers', () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.activateProvider([SAMPLE_PROVIDER_ID, DEFAULT_PROVIDER_ID]);
        expect(manager['_activeProviders'].size).toBe(2);
        expect(manager['_activeProviders'].has(DEFAULT_PROVIDER_ID)).toBe(true);
        expect(manager['_activeProviders'].has(SAMPLE_PROVIDER_ID)).toBe(true);
      });
      it('should skip unavailble providers', () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.activateProvider(['randomId']);
        expect(manager['_activeProviders'].size).toBe(2);
        expect(manager['_activeProviders'].has(DEFAULT_PROVIDER_ID)).toBe(true);
        expect(manager['_activeProviders'].has('randomId')).toBe(false);
      });
    });

    describe('#generateHandler()', () => {
      it('should create a handler with connector proxy', async () => {
        const handler = (await manager['generateHandler'](
          {}
        )) as CompletionHandler;
        expect(handler).toBeInstanceOf(CompletionHandler);
      });

      it('should create a handler with a custom model', async () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.activateProvider([SAMPLE_PROVIDER_ID]);
        const handler = (await manager['generateHandler'](
          {}
        )) as CompletionHandler;
        expect(handler.completer.model).toBeInstanceOf(CustomCompleterModel);
      });
    });

    describe('#updateHandler()', () => {
      it('should create a new handler for the notebook panel', async () => {
        const context = contextFactory();
        const widget = NBTestUtils.createNotebookPanel(context);
        const completerContext = { widget };

        await manager.updateCompleter(completerContext);
        expect(manager['_panelHandlers'].has(widget.id)).toBe(true);
      });

      it('should update the handler of a widget', async () => {
        const context = contextFactory();
        const widget = NBTestUtils.createNotebookPanel(context);
        const completerContext = { widget };

        await manager.updateCompleter(completerContext);
        const cell = new Cell({
          model: new TestCellModel({
            sharedModel: createStandaloneCell({ cell_type: 'code' })
          }),
          placeholder: false
        });
        const newCompleterContext = {
          editor: cell.editor,
          session: widget.sessionContext.session,
          widget
        };
        const handler = manager['_panelHandlers'].get(widget.id);
        manager.updateCompleter(newCompleterContext).catch(console.error);
        expect(handler.editor).toBe(newCompleterContext.editor);
      });
    });
  });
});
