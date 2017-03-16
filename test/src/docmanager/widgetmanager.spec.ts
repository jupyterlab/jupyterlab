// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, utils
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


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.Context): Widget {
    let widget = new Widget();
    widget.addClass('WidgetFactory');
    return widget;
  }
}


class LoggingManager extends DocumentWidgetManager {

  methods: string[] = [];

  filterMessage(handler: IMessageHandler, msg: Message): boolean {
    this.methods.push('filterMessage');
    return super.filterMessage(handler, msg);
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


describe('docmanager/widgetmanager', () => {

  let manager: LoggingManager;
  let services: ServiceManager.IManager;
  let modelFactory = new TextModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileExtensions: ['.txt']
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
      path: utils.uuid()
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
        let widget = manager.createWidget('test', context);
        expect(widget).to.be.a(Widget);
      });

      it('should throw an error if the name is not registered', () => {
        expect(() => {
          manager.createWidget('foo', context);
        }).to.throwError();
      });

      it('should emit the widgetCreated signal', () => {
        let called = false;
        widgetFactory.widgetCreated.connect(() => {
          called = true;
        });
        manager.createWidget('test', context);
        expect(called).to.be(true);
      });

    });

    describe('#adoptWidget()', () => {

      it('should install a message hook', () => {
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('filterMessage');
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
        let widget = manager.createWidget('test', context);
        expect(manager.findWidget(context, 'test')).to.be(widget);
      });

      it('should return undefined if not found', () => {
        expect(manager.findWidget(context, 'test')).to.be(void 0);
      });

    });

    describe('#contextForWidget()', () => {

      it('should return the context for a widget', () => {
        let widget = manager.createWidget('test', context);
        expect(manager.contextForWidget(widget)).to.be(context);
      });

      it('should return null if not tracked', () => {
        expect(manager.contextForWidget(new Widget())).to.be(null);
      });

    });

    describe('#cloneWidget()', () => {

      it('should create a new widget with the same context using the same factory', () => {
        let widget = manager.createWidget('test', context);
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

      it('should close all of the widgets associated with a context', (done) => {
        let called = false;
        let widget = manager.createWidget('test', context);
        let clone = manager.cloneWidget(widget);
        widget.disposed.connect(() => {
          if (called) {
            done();
          }
          called = true;
        });
        clone.disposed.connect(() => {
          if (called) {
            done();
          }
          called = true;
        });
        manager.closeWidgets(context);
      });

    });

    describe('#filterMessage()', () => {

      it('should be called for a message to a tracked widget', () => {
        let widget = new Widget();
        manager.adoptWidget(context, widget);
        MessageLoop.sendMessage(widget, new Message('foo'));
        expect(manager.methods).to.contain('filterMessage');
      });

      it('should return false for close-request messages', () => {
        let widget = manager.createWidget('test', context);
        let msg = new Message('close-request');
        expect(manager.filterMessage(widget, msg)).to.be(false);
      });

      it('should return true for other messages', () => {
        let widget = manager.createWidget('test', context);
        let msg = new Message('foo');
        expect(manager.filterMessage(widget, msg)).to.be(true);
      });

    });

    describe('#setCaption()', () => {

      it('should set the title of the widget', (done) => {
        context.save().then(() => {
          let widget = manager.createWidget('test', context);
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
        let widget = manager.createWidget('test', context);
        widget.disposed.connect(() => {
          expect(manager.methods).to.contain('onClose');
          done();
        });
        widget.close();
      });

      it('should prompt the user before closing', (done) => {
        context.model.fromString('foo');
        let widget = manager.createWidget('test', context);
        manager.onClose(widget).then(() => {
          expect(widget.isDisposed).to.be(true);
          done();
        });
        acceptDialog();
      });

      it('should close the widget', (done) => {
        context.model.fromString('foo');
        let widget = manager.createWidget('test', context);
        manager.onClose(widget).then(() => {
          expect(widget.isDisposed).to.be(false);
          done();
        });
        dismissDialog();
      });

    });

  });

});
