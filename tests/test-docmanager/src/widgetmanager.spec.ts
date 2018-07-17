// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import { ServiceManager } from '@jupyterlab/services';

import { DocumentWidgetManager } from '@jupyterlab/docmanager';

import {
  DocumentRegistry,
  TextModelFactory,
  ABCWidgetFactory,
  Context,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate, UUID } from '@phosphor/coreutils';

import { IMessageHandler, Message, MessageLoop } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { acceptDialog, dismissDialog } from '../../utils';

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

  setCaption(widget: Widget): void {
    this.methods.push('setCaption');
    super.setCaption(widget);
  }

  onClose(widget: Widget): Promise<boolean> {
    this.methods.push('onClose');
    return super.onClose(widget);
  }
}

describe('@jupyterlab/docmanager', () => {
  let manager: LoggingManager;
  let services: ServiceManager.IManager;
  let textModelFactory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileTypes: ['text']
  });
  let readOnlyFactory = new WidgetFactory({
    name: 'readonly',
    fileTypes: ['text'],
    readOnly: true
  });

  before(() => {
    services = new ServiceManager();
  });

  beforeEach(() => {
    let registry = new DocumentRegistry({ textModelFactory });
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
        expect(manager).to.be.a(DocumentWidgetManager);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the manager is disposed', () => {
        expect(manager.isDisposed).to.be(false);
        manager.dispose();
        expect(manager.isDisposed).to.be(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the manager', () => {
        expect(manager.isDisposed).to.be(false);
        manager.dispose();
        expect(manager.isDisposed).to.be(true);
        manager.dispose();
        expect(manager.isDisposed).to.be(true);
      });
    });

    describe('#createWidget()', () => {
      it('should create a widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(widget).to.be.a(Widget);
      });

      it('should emit the widgetCreated signal', () => {
        let called = false;

        widgetFactory.widgetCreated.connect(() => {
          called = true;
        });
        manager.createWidget(widgetFactory, context);
        expect(called).to.be(true);
      });
    });

    describe('#adoptWidget()', () => {
      it('should install a message hook', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('messageHook');
      });

      it('should add the document class', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        expect(widget.hasClass('jp-Document')).to.be(true);
      });

      it('should be retrievable', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        expect(manager.contextForWidget(widget)).to.be(context);
      });
    });

    describe('#findWidget()', () => {
      it('should find a registered widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(manager.findWidget(context, 'test')).to.be(widget);
      });

      it('should return undefined if not found', () => {
        expect(manager.findWidget(context, 'test')).to.be(undefined);
      });
    });

    describe('#contextForWidget()', () => {
      it('should return the context for a widget', () => {
        const widget = manager.createWidget(widgetFactory, context);

        expect(manager.contextForWidget(widget)).to.be(context);
      });

      it('should return undefined if not tracked', () => {
        expect(manager.contextForWidget(new Widget())).to.be(undefined);
      });
    });

    describe('#cloneWidget()', () => {
      it('should create a new widget with the same context using the same factory', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const clone = manager.cloneWidget(widget);

        expect(clone.hasClass('WidgetFactory')).to.be(true);
        expect(clone.hasClass('jp-Document')).to.be(true);
        expect(manager.contextForWidget(clone)).to.be(context);
      });

      it('should return undefined if the source widget is not managed', () => {
        expect(manager.cloneWidget(new Widget())).to.be(void 0);
      });
    });

    describe('#closeWidgets()', () => {
      it('should close all of the widgets associated with a context', async () => {
        const widget = manager.createWidget(widgetFactory, context);
        const clone = manager.cloneWidget(widget);

        await manager.closeWidgets(context);
        expect(widget.isDisposed).to.be(true);
        expect(clone.isDisposed).to.be(true);
      });
    });

    describe('#messageHook()', () => {
      it('should be called for a message to a tracked widget', () => {
        const content = new Widget();
        const widget = new DocumentWidget({ content, context });

        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('messageHook');
      });

      it('should return false for close-request messages', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const msg = new Message('close-request');

        expect(manager.messageHook(widget, msg)).to.be(false);
      });

      it('should return true for other messages', () => {
        const widget = manager.createWidget(widgetFactory, context);
        const msg = new Message('foo');

        expect(manager.messageHook(widget, msg)).to.be(true);
      });
    });

    describe('#setCaption()', () => {
      it('should set the title of the widget', async () => {
        await context.initialize(true);

        const widget = manager.createWidget(widgetFactory, context);
        const delegate = new PromiseDelegate();

        widget.title.changed.connect(async () => {
          expect(manager.methods).to.contain('setCaption');
          expect(widget.title.caption).to.contain('Last Checkpoint');
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
          expect(manager.methods).to.contain('onClose');
          await dismissDialog();
          delegate.resolve(undefined);
        });
        widget.close();
      });

      it('should prompt the user before closing', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const widget = manager.createWidget(widgetFactory, context);
        const closed = manager.onClose(widget);

        await acceptDialog();
        await closed;

        expect(widget.isDisposed).to.be(true);
      });

      it('should not prompt if the factory is readonly', async () => {
        const readonly = manager.createWidget(readOnlyFactory, context);

        await manager.onClose(readonly);

        expect(readonly.isDisposed).to.be(true);
      });

      it('should not prompt if the other widget is writable', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const one = manager.createWidget(widgetFactory, context);
        const two = manager.createWidget(widgetFactory, context);

        await manager.onClose(one);

        expect(one.isDisposed).to.be(true);
        expect(two.isDisposed).to.be(false);
        two.dispose();
      });

      it('should prompt if the only other widget has a readonly factory', async () => {
        // Populate the model with content.
        context.model.fromString('foo');

        const writable = manager.createWidget(widgetFactory, context);
        const readonly = manager.createWidget(readOnlyFactory, context);
        const closed = manager.onClose(writable);

        await acceptDialog();
        await closed;

        expect(writable.isDisposed).to.be(true);
        expect(readonly.isDisposed).to.be(false);
        readonly.dispose();
      });

      it('should close the widget', done => {
        context.model.fromString('foo');
        let widget = manager.createWidget(widgetFactory, context);
        manager.onClose(widget).then(() => {
          expect(widget.isDisposed).to.be(false);
          done();
        });
        dismissDialog();
      });
    });
  });
});
