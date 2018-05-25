// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Widget
} from '@phosphor/widgets';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory, DocumentWidget, IDocumentWidget
} from '@jupyterlab/docregistry';

import {
  dismissDialog
} from '../../utils';


class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {

  protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget {
    const content = new Widget();
    const widget = new DocumentWidget({ content, context });
    widget.addClass('WidgetFactory');
    return widget;
  }
}


describe('@jupyterlab/docmanager', () => {

  let manager: DocumentManager;
  let services: ServiceManager.IManager;
  let context: DocumentRegistry.Context;
  let widget: Widget;
  let textModelFactory = new TextModelFactory();
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileTypes: ['text'],
    canStartKernel: true,
    preferKernel: true
  });

  before(() => {
    services = new ServiceManager();
    return services.ready;
  });

  beforeEach(() => {
    let registry = new DocumentRegistry({ textModelFactory });
    registry.addWidgetFactory(widgetFactory);
    DocumentRegistry.defaultFileTypes.forEach(ft => {
      registry.addFileType(ft);
    });
    manager = new DocumentManager({
      registry,
      manager: services,
      opener: {
        open: (widget: Widget) => {
          // no-op
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

    describe('#services', () => {

      it('should get the service manager for the manager', () => {
        expect(manager.services).to.be.a(ServiceManager);
      });

    });

    describe('#registry', () => {

      it('should get the registry used by the manager', () => {
        expect(manager.registry).to.be.a(DocumentRegistry);
      });

    });

    describe('#open()', () => {

      it('should open a file and return the widget used to view it', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.open(model.path);
          expect(widget.hasClass('WidgetFactory')).to.be(true);
          return dismissDialog();
        });
      });

      it('should start a kernel if one is given', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          return services.sessions.startNew({ path: model.path });
        }).then(session => {
          let id = session.kernel.id;
          widget = manager.open(session.path, 'default', { id });
          context = manager.contextForWidget(widget);
          return context.session.ready;
        }).then(() => {
          expect(context.session.kernel).to.be.ok();
          return context.session.shutdown();
        });
      });

      it('should not auto-start a kernel if there is none given', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.open(model.path, 'default');
          context = manager.contextForWidget(widget);
          return dismissDialog();
        }).then(() => {
          expect(context.session.kernel).to.be(null);
        });
      });

      it('should return undefined if the factory is not found', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.open(model.path, 'foo');
          expect(widget).to.be(void 0);
        });
      });

      it('should return undefined if the factory has no model factory', () => {
        let widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.open(model.path, 'foo');
          expect(widget).to.be(void 0);
        });
      });

    });

    describe('#createNew()', () => {

      it('should open a file and return the widget used to view it', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path);
          expect(widget.hasClass('WidgetFactory')).to.be(true);
          return dismissDialog();
        });
      });

      it('should start a kernel if one is given', () => {
        let id: string;
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          return services.sessions.startNew({ path: model.path });
        }).then(session => {
          id = session.kernel.id;
          widget = manager.createNew(session.path, 'default', { id });
          context = manager.contextForWidget(widget);
          return context.session.ready;
        }).then(() => {
          expect(context.session.kernel.id).to.be(id);
          return context.session.shutdown();
        });
      });

      it('should not start a kernel if not given', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path, 'default');
          context = manager.contextForWidget(widget);
          return dismissDialog();
        }).then(() => {
          expect(context.session.kernel).to.be(null);
        });
      });

      it('should return undefined if the factory is not found', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path, 'foo');
          expect(widget).to.be(void 0);
        });
      });

      it('should return undefined if the factory has no model factory', () => {
        let widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path, 'foo');
          expect(widget).to.be(void 0);
        });
      });
    });

    describe('#findWidget()', () => {

      it('should find a widget given a file and a widget name', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path);
          expect(manager.findWidget(model.path, 'test')).to.be(widget);
          return dismissDialog();
        });
      });

      it('should find a widget given a file', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path);
          expect(manager.findWidget(model.path)).to.be(widget);
          return dismissDialog();
        });
      });

      it('should fail to find a widget', () => {
         expect(manager.findWidget('foo')).to.be(void 0);
      });

    });

    describe('#contextForWidget()', () => {

      it('should find the context for a widget', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path);
          context = manager.contextForWidget(widget);
          expect(context.path).to.be(model.path);
          return dismissDialog();
        });
      });

      it('should fail to find the context for the widget', () => {
        widget = new Widget();
        expect(manager.contextForWidget(widget)).to.be(undefined);
      });

    });

    describe('#cloneWidget()', () => {

      it('should clone the given widget', () => {
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          widget = manager.createNew(model.path);
          let clone = manager.cloneWidget(widget);
          expect(manager.contextForWidget(widget)).to.be(manager.contextForWidget(clone));
          return dismissDialog();
        });
      });

      it('should return undefined if the source widget is not managed', () => {
        widget = new Widget();
        expect(manager.cloneWidget(widget)).to.be(void 0);
      });

    });

    describe('#closeFile()', () => {

      it('should close the widgets associated with a given path', () => {
        let called = 0;
        let path = '';
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          path = model.path;
          widget = manager.createNew(path);
          let clone = manager.cloneWidget(widget);

          widget.disposed.connect(() => { called++; });
          clone.disposed.connect(() => { called++; });
          return dismissDialog();
        }).then(() => {
          return manager.closeFile(path);
        }).then(() => {
          expect(called).to.be(2);
        });
      });

      it('should be a no-op if there are no open files on that path', () => {
        return manager.closeFile('foo');
      });

    });

    describe('#closeAll()', () => {

      it('should close all of the open documents', () => {
        let called = 0;
        let path = '';
        return services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          path = model.path;
          let widget0 = manager.createNew(path);
          widget0.disposed.connect(() => { called++; });
          return dismissDialog();
        }).then(() => {
          let widget1 = manager.createNew(path);
          widget1.disposed.connect(() => { called++; });
          return dismissDialog();
        }).then(() => {
          return manager.closeAll();
        }).then(() => {
          expect(called).to.be(2);
        });
      });

      it('should be a no-op if there are no open documents', () => {
        return manager.closeAll();
      });

    });

  });

});
