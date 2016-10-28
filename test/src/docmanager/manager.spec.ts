// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, utils
} from '@jupyterlab/services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentManager
} from '../../../lib/docmanager';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory, Context
} from '../../../lib/docregistry';

import {
  acceptDialog, dismissDialog
} from '../utils';


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.IContext<DocumentRegistry.IModel>): Widget {
    let widget = new Widget();
    widget.addClass('WidgetFactory');
    return widget;
  }
}


describe('docmanager/manager', () => {

  let manager: DocumentManager;
  let services: ServiceManager.IManager;
  let modelFactory = new TextModelFactory();
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileExtensions: ['.txt']
  });
  let openedWidget: Widget;

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
    manager = new DocumentManager({
      registry,
      manager: services,
      opener: {
        open: (widget: Widget) => {
          openedWidget = widget;
        }
      }
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('DocumentWidgetManager', () => {

    describe('#constructor()', () => {

      it('should create a new document manager', () => {
        expect(manager).to.be.a(DocumentManager);
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

    describe('#kernelspecs', () => {

    });

    describe('#registry', () => {

    });

    describe('#open()', () => {

    });

    describe('#createNew()', () => {

    });

    describe('#listSessions()', () => {

    });

    describe('#handleRename()', () => {

    });

    describe('#handleDelete()', () => {

    });

    describe('#findWidget()', () => {

    });

    describe('#contextForWidget()', () => {

    });

    describe('#cloneWidget()', () => {

    });

    describe('#closeFile()', () => {

    });

    describe('#closeAll()', () => {

    });

  });

});
