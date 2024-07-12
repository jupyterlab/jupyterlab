// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ABCWidgetFactory,
  Context,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { ServiceManager } from '@jupyterlab/services';
import { acceptDialog, dangerDialog, dismissDialog } from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { PromiseDelegate, UUID } from '@lumino/coreutils';
import { IMessageHandler, Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { DocumentWidgetManager } from '../src';

class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget {
    const content = new Widget();
    const widget = new DocumentWidget({ content, context });
    widget.addClass('WidgetFactory');
    return widget;
  }
}

class LoggingManager extends DocumentWidgetManager {
  methods: string[] = [];

  messageHook(handler: IMessageHandler, msg: Message): boolean {
    this.methods.push('messageHook');
    return super.messageHook(handler, msg);
  }

  setCaption(widget: Widget): Promise<void> {
    this.methods.push('setCaption');
    return super.setCaption(widget);
  }

  onClose(widget: Widget): Promise<boolean> {
    this.methods.push('onClose');
    return super.onClose(widget);
  }
}

describe('@jupyterlab/docmanager', () => {
  let manager: LoggingManager;
  let services: ServiceManager.IManager;
  const textModelFactory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  const widgetFactory = new WidgetFactory({
    name: 'test',
    fileTypes: ['text']
  });
  const readOnlyFactory = new WidgetFactory({
    name: 'readonly',
    fileTypes: ['text'],
    readOnly: true
  });

  beforeAll(() => {
    services = new ServiceManagerMock();
  });

  beforeEach(() => {
    const registry = new DocumentRegistry({ textModelFactory });
    registry.addWidgetFactory(widgetFactory);
    manager = new LoggingManager({ registry });
    context = new Context({
      manager: services,
      factory: textModelFactory,
      path: UUID.uuid4()
    });
  });

  afterEach(() => {
    manager.dispose();
    context.dispose();
  });

  describe('DocumentWidgetManager', () => {
    describe('#constructor()', () => {
      it('should create a new document widget manager', () => {
        expect(manager).toBeInstanceOf(DocumentWidgetManager);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the manager is disposed', () => {
        expect(manager.isDisposed).toBe(false);
        manager.dispose();
        expect(manager.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the manager', () => {
        expect(manager.isDisposed).toBe(false);
        manager.dispose();
        expect(manager.isDisposed).toBe(true);
        manager.dispose();
        expect(manager.isDisposed).toBe(true);
      });
    });

    describe('#createWidget()', () => {
      it('should create a widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(widget).toBeInstanceOf(Widget);
      });

      it('should emit the widgetCreated signal', () => {
        let called = false;

        widgetFactory.widgetCreated.connect(() => {
          called = true;
        });
        manager.createWidget(widgetFactory, context);
        expect(called).toBe(true);
      });
    });

    describe('#adoptWidget()', () => {
      it('should install a message hook', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).toEqual(
          expect.arrayContaining(['messageHook'])
        );
      });

      it('should add the document class', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        expect(widget.hasClass('jp-Document')).toBe(true);
      });

      it('should be retrievable', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        expect(manager.contextForWidget(widget)).toBe(context);
      });
    });

    describe('#findWidget()', () => {
      it('should find a registered widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(manager.findWidget(context, 'test')).toBe(widget);
      });

      it('should return undefined if not found', () => {
        expect(manager.findWidget(context, 'test')).toBeUndefined();
      });
    });

    describe('#contextForWidget()', () => {
      it('should return the context for a widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(manager.contextForWidget(widget)).toBe(context);
      });

      it('should return undefined if not tracked', () => {
        expect(manager.contextForWidget(new Widget())).toBeUndefined();
      });
    });

    describe('#cloneWidget()', () => {
      it('should create a new widget with the same context using the same factory', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const clone = manager.cloneWidget(widget)!;

        expect(clone.hasClass('WidgetFactory')).toBe(true);
        expect(clone.hasClass('jp-Document')).toBe(true);
        expect(manager.contextForWidget(clone)).toBe(context);
      });

      it('should return undefined if the source widget is not managed', () => {
        expect(manager.cloneWidget(new Widget())).toBeUndefined();
      });
    });

    describe('#closeWidgets()', () => {
      it('should close all of the widgets associated with a context', async () => {
        const widget = manager.createWidget(widgetFactory, context);
        const clone = manager.cloneWidget(widget)!;

        await manager.closeWidgets(context);
        expect(widget.isDisposed).toBe(true);
        expect(clone.isDisposed).toBe(true);
      });
    });

    describe('#messageHook()', () => {
      it('should be called for a message to a tracked widget', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).toEqual(
          expect.arrayContaining(['messageHook'])
        );
      });

      it('should return false for close-request messages', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const msg = new Message('close-request');

        expect(manager.messageHook(widget, msg)).toBe(false);
      });

      it('should return true for other messages', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const msg = new Message('foo');

        expect(manager.messageHook(widget, msg)).toBe(true);
      });
    });

    describe('#setCaption()', () => {
      it('should set the title of the widget', async () => {
        await context.initialize(true);

        const widget = manager.createWidget(widgetFactory, context);
        const delegate = new PromiseDelegate();

        widget.title.changed.connect(async () => {
          expect(manager.methods).toEqual(
            expect.arrayContaining(['setCaption'])
          );
          expect(widget.title.caption).toContain('Last Checkpoint');
          await dismissDialog();
          delegate.resolve(undefined);
        });
        await delegate.promise;
      });
    });

    describe('#onClose()', () => {
      it('should be called when a widget is closed', async () => {
        const widget = manager.createWidget(widgetFactory, context);
        const delegate = new PromiseDelegate();

        widget.disposed.connect(async () => {
          expect(manager.methods).toEqual(expect.arrayContaining(['onClose']));
          await dismissDialog();
          delegate.resolve(undefined);
        });
        widget.close();
        await delegate.promise;
      });

      it('should ask confirmation when a widget is closing', async () => {
        manager.confirmClosingDocument = true;
        const widget = manager.createWidget(widgetFactory, context);

        widget.close();
        await dismissDialog();

        expect(widget.isDisposed).toEqual(false);
        widget.dispose();
      });

      it('should confirm widget close action', async () => {
        manager.confirmClosingDocument = true;
        const widget = manager.createWidget(widgetFactory, context);
        const delegate = new PromiseDelegate();

        widget.close();
        await acceptDialog();

        widget.disposed.connect(async () => {
          expect(manager.methods).toEqual(expect.arrayContaining(['onClose']));
          delegate.resolve(undefined);
        });
        await delegate.promise;
      });

      it('should prompt the user before closing', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const widget = manager.createWidget(widgetFactory, context);
        const closed = manager.onClose(widget);

        await Promise.all([dangerDialog(), closed]);

        expect(widget.isDisposed).toBe(true);
      });

      it('should ask confirmation when a dirty widget is closing', async () => {
        manager.confirmClosingDocument = true;
        context.model.fromString('foo');

        const widget = manager.createWidget(widgetFactory, context);
        const closed = manager.onClose(widget);

        await Promise.all([dangerDialog(), closed]);

        expect(widget.isDisposed).toBe(true);
      });

      it('should not prompt if the factory is readonly', async () => {
        const readonly = manager.createWidget(readOnlyFactory, context);

        await manager.onClose(readonly);

        expect(readonly.isDisposed).toBe(true);
      });

      it('should not prompt if the other widget is writable', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const one = manager.createWidget(widgetFactory, context);
        const two = manager.createWidget(widgetFactory, context);

        await manager.onClose(one);

        expect(one.isDisposed).toBe(true);
        expect(two.isDisposed).toBe(false);
        two.dispose();
      });

      it('should prompt if the only other widget has a readonly factory', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const writable = manager.createWidget(widgetFactory, context);
        const readonly = manager.createWidget(readOnlyFactory, context);
        const closed = manager.onClose(writable);

        await dangerDialog();
        await closed;

        expect(writable.isDisposed).toBe(true);
        expect(readonly.isDisposed).toBe(false);
        readonly.dispose();
      });

      it('should close the widget', async () => {
        context.model.fromString('foo');
        const widget = manager.createWidget(widgetFactory, context);
        const promise = manager.onClose(widget);
        await dismissDialog();
        await promise;
        expect(widget.isDisposed).toBe(false);
      });
    });
  });
});
