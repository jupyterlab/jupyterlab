// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  IMessageHandler, Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  DocumentWidgetManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory, Context
} from '@jupyterlab/docregistry';

import {
  acceptDialog, dismissDialog
} from '../utils';



class DocWidget extends Widget implements DocumentRegistry.IReadyWidget {
  get ready(): Promise<void> {
    return Promise.resolve(undefined);
  }
}


class WidgetFactory extends ABCWidgetFactory<DocumentRegistry.IReadyWidget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.Context): DocumentRegistry.IReadyWidget {
    let widget = new DocWidget();
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
  let modelFactory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileExtensions: ['.txt']
  });
  let readOnlyFactory = new WidgetFactory({
    name: 'readonly',
    fileExtensions: ['.txt'],
    readOnly: true
  });

  before(() => {
    services = new ServiceManager();
  });

  beforeEach(() => {
    let registry = new DocumentRegistry();
    registry.addModelFactory(modelFactory);
    registry.addWidgetFactory(widgetFactory);
    manager = new LoggingManager({ registry });
    context = new Context({
      manager: services,
      factory: modelFactory,
      path: uuid()
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
        let widget = manager.createWidget(widgetFactory, context);
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
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('messageHook');
      });

      it('should add the document class', () => {
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        expect(widget.hasClass('jp-Document')).to.be(true);
      });

      it('should be retrievable', () => {
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        expect(manager.contextForWidget(widget)).to.be(context);
      });

    });

    describe('#findWidget()', () => {

      it('should find a registered widget', () => {
        let widget = manager.createWidget(widgetFactory, context);
        expect(manager.findWidget(context, 'test')).to.be(widget);
      });

      it('should return undefined if not found', () => {
        expect(manager.findWidget(context, 'test')).to.be(void 0);
      });

    });

    describe('#contextForWidget()', () => {

      it('should return the context for a widget', () => {
        let widget = manager.createWidget(widgetFactory, context);
        expect(manager.contextForWidget(widget)).to.be(context);
      });

      it('should return null if not tracked', () => {
        expect(manager.contextForWidget(new Widget())).to.be(null);
      });

    });

    describe('#cloneWidget()', () => {

      it('should create a new widget with the same context using the same factory', () => {
        let widget = manager.createWidget(widgetFactory, context);
        let clone = manager.cloneWidget(widget);
        expect(clone.hasClass('WidgetFactory')).to.be(true);
        expect(clone.hasClass('jp-Document')).to.be(true);
        expect(manager.contextForWidget(clone)).to.be(context);
      });

      it('should return undefined if the source widget is not managed', () => {
        expect(manager.cloneWidget(new Widget())).to.be(void 0);
      });

    });

    describe('#closeWidgets()', () => {

      it('should close all of the widgets associated with a context', () => {
        let called = 0;
        let widget = manager.createWidget(widgetFactory, context);
        let clone = manager.cloneWidget(widget);
        widget.disposed.connect(() => { called++; });
        clone.disposed.connect(() => { called++; });
        return manager.closeWidgets(context).then(() => {
          expect(called).to.be(2);
        });
      });

    });

    describe('#messageHook()', () => {

      it('should be called for a message to a tracked widget', () => {
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('messageHook');
      });

      it('should return false for close-request messages', () => {
        let widget = manager.createWidget(widgetFactory, context);
        let msg = new Message('close-request');
        expect(manager.messageHook(widget, msg)).to.be(false);
      });

      it('should return true for other messages', () => {
        let widget = manager.createWidget(widgetFactory, context);
        let msg = new Message('foo');
        expect(manager.messageHook(widget, msg)).to.be(true);
      });

    });

    describe('#setCaption()', () => {

      it('should set the title of the widget', (done) => {
        context.save().then(() => {
          let widget = manager.createWidget(widgetFactory, context);
          widget.title.changed.connect(() => {
            expect(manager.methods).to.contain('setCaption');
            expect(widget.title.caption).to.contain('Last Checkpoint');
            done();
          });
        });
      });

    });

    describe('#onClose()', () => {

      it('should be called when a widget is closed', (done) => {
        let widget = manager.createWidget(widgetFactory, context);
        widget.disposed.connect(() => {
          expect(manager.methods).to.contain('onClose');
          done();
        });
        widget.close();
      });

      it('should prompt the user before closing', (done) => {
        context.model.fromString('foo');
        let widget = manager.createWidget(widgetFactory, context);
        manager.onClose(widget).then(() => {
          expect(widget.isDisposed).to.be(true);
          done();
        });
        acceptDialog();
      });

      it('should not prompt if the factory is readonly', () => {
        context.model.fromString('foo');
        let widget = manager.createWidget(readOnlyFactory, context);
        return manager.onClose(widget).then(() => {
          expect(widget.isDisposed).to.be(true);
        });
      });

      it('should not prompt if the other widget is writable', () => {
        context.model.fromString('foo');
        let widget0 = manager.createWidget(widgetFactory, context);
        let widget1 = manager.createWidget(widgetFactory, context);
        return manager.onClose(widget0).then(() => {
          expect(widget0.isDisposed).to.be(true);
          widget1.dispose();
        });
      });

      it('should prompt if the only other widget has a readonly factory', (done) => {
        context.model.fromString('foo');
        let widget0 = manager.createWidget(widgetFactory, context);
        let widget1 = manager.createWidget(readOnlyFactory, context);
        manager.onClose(widget1).then(() => {
          expect(widget1.isDisposed).to.be(true);
          widget0.dispose();
          done();
        });
        acceptDialog();
      });

      it('should close the widget', (done) => {
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
