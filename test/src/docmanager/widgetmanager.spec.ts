// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, utils
} from '@jupyterlab/services';

import {
  IMessageHandler, Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory, Context
} from '../../../lib/docregistry';

import {
  DocumentWidgetManager
} from '../../../lib/docmanager';


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.IContext<DocumentRegistry.IModel>): Widget {
    return new Widget();
  }
}


class LoggingManager extends DocumentWidgetManager {

  methods: string[] = [];

  protected filterMessage(handler: IMessageHandler, msg: Message): boolean {
    this.methods.push('filterMessage');
    return super.filterMessage(handler, msg);
  }

  protected setCaption(widget: Widget): void {
    this.methods.push('setCaption');
    super.setCaption(widget);
  }

  protected onClose(widget: Widget): Promise<boolean> {
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

  before((done) => {
    ServiceManager.create().then(m => {
      services = m;
      done();
    }).catch(done);
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
        sendMessage(widget, new Message('foo'));
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

    });

    describe('#contextForWidget()', () => {

    });

    describe('#cloneWidget()', () => {

    });

    describe('#closeWidgets()', () => {

    });

    describe('#filterMessage()', () => {

    });

    describe('#setCaption()', () => {

    });

    describe('#onClose()', () => {

    });

  });

});
