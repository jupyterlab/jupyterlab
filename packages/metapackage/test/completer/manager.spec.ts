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
  IInlineCompleterActions,
  IInlineCompleterSettings,
  IInlineCompletionProvider,
  InlineCompleter,
  ProviderReconciliator
} from '@jupyterlab/completer';
import { Context } from '@jupyterlab/docregistry';
import {
  INotebookModel,
  NotebookModelFactory,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ServiceManager } from '@jupyterlab/services';
import { createStandaloneCell } from '@jupyter/ydoc';
import { nullTranslator } from '@jupyterlab/translation';

import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

const DEFAULT_PROVIDER_ID = 'CompletionProvider:context';
const SAMPLE_PROVIDER_ID = 'CompletionProvider:sample';

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

class TestCellModel extends CellModel {
  get type(): string {
    return 'code';
  }
}

class CustomCompleterModel extends CompleterModel {}

class CustomRenderer extends Completer.Renderer {}

class FooCompletionProvider implements ICompletionProvider {
  identifier: string = SAMPLE_PROVIDER_ID;
  renderer = new CustomRenderer();
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
    if (!(this instanceof FooCompletionProvider)) {
      throw new Error(
        'The context `this` should be an instance of `FooCompletionProvider`.'
      );
    }
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
        jest.spyOn(console, 'warn').mockImplementation();
        manager.registerProvider(new FooCompletionProvider());
        expect(manager.getProviders().size).toBe(2);
        expect(console.warn).toHaveBeenLastCalledWith(
          expect.stringContaining(
            'CompletionProvider:sample is already registered'
          )
        );
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
      it('should skip unavailable providers', () => {
        manager.registerProvider(new FooCompletionProvider());
        manager.activateProvider(['randomId']);
        expect(manager['_activeProviders'].size).toBe(2);
        expect(manager['_activeProviders'].has(DEFAULT_PROVIDER_ID)).toBe(true);
        expect(manager['_activeProviders'].has('randomId')).toBe(false);
      });
    });

    describe('#updateCompleter()', () => {
      let completerContext: ICompletionContext;
      let widget: NotebookPanel;
      beforeEach(() => {
        const context = contextFactory();
        widget = NBTestUtils.createNotebookPanel(context);
        completerContext = { widget };
      });

      it('should create a new handler for the notebook panel', async () => {
        await manager.updateCompleter(completerContext);
        expect(manager['_panelHandlers'].has(widget.id)).toBe(true);
      });

      it('should update the handler of a widget', async () => {
        await manager.updateCompleter(completerContext);
        const cell = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
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

      it('should update renderer if providers changed', async () => {
        // create the completer
        await manager.updateCompleter(completerContext);
        const handler = manager['_panelHandlers'].get(
          widget.id
        ) as CompletionHandler;
        // no custom renderer shall be set at this point
        expect(handler.completer.renderer).not.toBeInstanceOf(CustomRenderer);

        // change providers
        const provider = new FooCompletionProvider();
        manager.registerProvider(provider);
        manager.activateProvider([provider.identifier]);

        // update after providers changed
        await manager.updateCompleter(completerContext);
        expect(handler.completer.renderer).toBeInstanceOf(CustomRenderer);
      });

      it('should update model if providers changed', async () => {
        // create the completer
        await manager.updateCompleter(completerContext);
        const handler = manager['_panelHandlers'].get(
          widget.id
        ) as CompletionHandler;
        // no custom model shall be set at this point
        expect(handler.completer.model).not.toBeInstanceOf(
          CustomCompleterModel
        );

        // change providers
        const provider = new FooCompletionProvider();
        manager.registerProvider(provider);
        manager.activateProvider([provider.identifier]);

        // update after providers changed
        await manager.updateCompleter(completerContext);
        expect(handler.completer.model).toBeInstanceOf(CustomCompleterModel);
      });
    });

    describe('#selected', () => {
      let completerContext: ICompletionContext;
      let widget: NotebookPanel;

      beforeEach(() => {
        const context = contextFactory();
        widget = NBTestUtils.createNotebookPanel(context);
        completerContext = { widget };
      });

      it('should emit `selected` signal', async () => {
        const callback = jest.fn();
        await manager.updateCompleter(completerContext);
        const handler = manager['_panelHandlers'].get(
          widget.id
        ) as CompletionHandler;
        handler.completer.model!.setCompletionItems([{ label: 'foo' }]);
        MessageLoop.sendMessage(handler.completer, Widget.Msg.UpdateRequest);

        manager.selected.connect(callback);
        expect(callback).toHaveBeenCalledTimes(0);
        manager.select(widget.id);
        expect(callback).toHaveBeenCalledTimes(1);
        manager.selected.disconnect(callback);
      });
    });

    describe('#inline', () => {
      let inline: IInlineCompleterActions;
      beforeEach(() => {
        manager.setInlineCompleterFactory({
          factory: options =>
            new InlineCompleter({
              ...options,
              trans: nullTranslator.load('jupyterlab')
            })
        });
        inline = manager.inline!;
      });

      describe('#configure', () => {
        it('should call `configure()` method of each provider', () => {
          const provider1: IInlineCompletionProvider = {
            fetch: async () => {
              return { items: [] };
            },
            name: 'an inline provider',
            identifier: 'test-provider-1',
            configure: jest.fn()
          };
          const provider2: IInlineCompletionProvider = {
            fetch: async () => {
              return { items: [] };
            },
            name: 'a second inline provider',
            identifier: 'test-provider-2',
            configure: jest.fn()
          };
          manager.registerInlineProvider(provider1);
          manager.registerInlineProvider(provider2);
          expect(provider1.configure).toHaveBeenCalledTimes(0);

          const sharedConfig = {
            debouncerDelay: 0,
            timeout: 10000,
            autoFillInMiddle: false
          };
          inline.configure({
            providers: {
              'test-provider-1': {
                ...sharedConfig,
                enabled: true
              },
              'test-provider-2': {
                ...sharedConfig,
                enabled: false
              }
            } as IInlineCompleterSettings['providers']
          } as IInlineCompleterSettings);
          expect(provider1.configure).toHaveBeenCalledTimes(1);
          expect(provider1.configure).toHaveBeenLastCalledWith(
            expect.objectContaining({
              enabled: true
            })
          );
          expect(provider2.configure).toHaveBeenCalledTimes(1);
          expect(provider2.configure).toHaveBeenLastCalledWith(
            expect.objectContaining({
              enabled: false
            })
          );
        });
      });
    });
  });
});
