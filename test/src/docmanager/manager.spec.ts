// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentManager
} from '../../../lib/docmanager';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory
} from '../../../lib/docregistry';


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

      it('should get the kernel spec models for the manager', () => {
        expect(manager.kernelspecs).to.be(services.kernelspecs);
      });

    });

    describe('#registry', () => {

      it('should get the registry used by the manager', () => {
        expect(manager.registry).to.be.a(DocumentRegistry);
      });

    });

    describe('#open()', () => {

      it('should open a file and return the widget used to view it', done => {
        services.contents.newUntitled({ type: 'file', ext: 'text'}).then(model => {
          let widget = manager.open(model.path);
          expect(widget.hasClass('WidgetFactory')).to.be(true);
        });
      });

      it('should start a kernel if one is given', () => {

      });

      it('should return undefined if the factory is not found', () => {

      });

      it('should return undefined if the factory has not model factory', () => {

      });

    });

    describe('#createNew()', () => {

      it('should create a new file and return the widget used to view it', () => {

      });

      it('should start a kernel if one is given', () => {

      });

      it('should return undefined if the factory is not found', () => {

      });

      it('should return undefined if the factory has not model factory', () => {

      });

    });

    describe('#listSessions()', () => {

      it('should list the running notebook sessions', () => {

      });

    });

    describe('#handleRename()', () => {

      it('should handle the renaming of an open document', () => {

      });

    });

    describe('#handleDelete()', () => {

      it('should handle a file deletion', () => {

      });

    });

    describe('#findWidget()', () => {

      it('should find a widget given a file and a widget name', () => {

      });

      it('should find a widget given a file', () => {

      });

      it('should fail to find the widget', () => {

      });

    });

    describe('#contextForWidget()', () => {

      it('should find the context for a widget', () => {

      });

      it('should fail to find the context for the widget', () => {

      });

    });

    describe('#cloneWidget()', () => {

      it('should clone the given widget', () => {

      });

      it('should return undefined if the source widget is not managed', () => {

      });

    });

    describe('#closeFile()', () => {

      it('should close the widgets associated with a given path', () => {

      });

      it('should be a no-op if there are no open files on that path', () => {

      });

    });

    describe('#closeAll()', () => {

      it('should close all of the open documents', () => {

      });

      it('should be a no-op if there are no open documents', () => {

      });

    });

  });

});
