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
  DocumentRegistry, TextModelFactory, ABCWidgetFactory
} from '@jupyterlab/docregistry';


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.Context): Widget {
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
    fileExtensions: ['.txt'],
    canStartKernel: true,
    preferKernel: true
  });
  let openedWidget: Widget;

  before((done) => {
    services = new ServiceManager();
    services.ready.then(done, done);
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

      it('should open a file and return the widget used to view it', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.open(model.path);
          expect(widget.hasClass('WidgetFactory')).to.be(true);
          done();
        }).catch(done);
      });

      it('should start a kernel if one is given', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          return services.sessions.startNew({ path: model.path });
        }).then(session => {
          let id = session.kernel.id;
          let widget = manager.open(session.path, 'default', { id });
          let context = manager.contextForWidget(widget);
          context.kernelChanged.connect(() => {
            expect(context.kernel.id).to.be(id);
            done();
          });
        }).catch(done);
      });

      it('should start the default kernel if applicable', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let name = services.specs.default;
          let widget = manager.open(model.path, 'default');
          let context = manager.contextForWidget(widget);
          context.kernelChanged.connect(() => {
            expect(context.kernel.name).to.be(name);
            done();
          });
        }).catch(done);
      });

      it('should not start a kernel if given an invalid one', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let name = services.specs.default;
          let widget = manager.open(model.path, 'default');
          let context = manager.contextForWidget(widget);
          expect(context.kernel).to.be(null);
          done();
        }).catch(done);
      });

      it('should return undefined if the factory is not found', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.open(model.path, 'foo');
          expect(widget).to.be(void 0);
          done();
        }).catch(done);
      });

      it('should return undefined if the factory has no model factory', (done) => {
        let widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileExtensions: ['.txt']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.open(model.path, 'foo');
          expect(widget).to.be(void 0);
          done();
        }).catch(done);
      });

    });

    describe('#createNew()', () => {

      it('should open a file and return the widget used to view it', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          expect(widget.hasClass('WidgetFactory')).to.be(true);
          done();
        }).catch(done);
      });

      it('should start a kernel if one is given', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          return services.sessions.startNew({ path: model.path });
        }).then(session => {
          let id = session.kernel.id;
          let widget = manager.createNew(session.path, 'default', { id });
          let context = manager.contextForWidget(widget);
          context.kernelChanged.connect(() => {
            expect(context.kernel.id).to.be(id);
            done();
          });
        }).catch(done);
      });

      it('should start the default kernel if applicable', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let name = services.specs.default;
          let widget = manager.createNew(model.path, 'default');
          let context = manager.contextForWidget(widget);
          context.kernelChanged.connect(() => {
            expect(context.kernel.name).to.be(name);
            done();
          });
        }).catch(done);
      });

      it('should not start a kernel if given an invalid one', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let name = services.specs.default;
          let widget = manager.createNew(model.path, 'default');
          let context = manager.contextForWidget(widget);
          expect(context.kernel).to.be(null);
          done();
        }).catch(done);
      });

      it('should return undefined if the factory is not found', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path, 'foo');
          expect(widget).to.be(void 0);
          done();
        }).catch(done);
      });

      it('should return undefined if the factory has no model factory', (done) => {
        let widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileExtensions: ['.txt']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path, 'foo');
          expect(widget).to.be(void 0);
          done();
        }).catch(done);
      });
    });


    describe('#findWidget()', () => {

      it('should find a widget given a file and a widget name', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          expect(manager.findWidget(model.path, 'test')).to.be(widget);
          done();
        }).catch(done);
      });

      it('should find a widget given a file', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          expect(manager.findWidget(model.path)).to.be(widget);
          done();
        }).catch(done);
      });

      it('should fail to find a widget', () => {
         expect(manager.findWidget('foo')).to.be(void 0);
      });

    });

    describe('#contextForWidget()', () => {

      it('should find the context for a widget', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          let context = manager.contextForWidget(widget);
          expect(context.path).to.be(model.path);
          done();
        }).catch(done);
      });

      it('should fail to find the context for the widget', () => {
        let widget = new Widget();
        expect(manager.contextForWidget(widget)).to.be(null);
      });

    });

    describe('#cloneWidget()', () => {

      it('should clone the given widget', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          let clone = manager.cloneWidget(widget);
          expect(manager.contextForWidget(widget)).to.be(manager.contextForWidget(clone));
          done();
        }).catch(done);
      });

      it('should return undefined if the source widget is not managed', () => {
        let widget = new Widget();
        expect(manager.cloneWidget(widget)).to.be(void 0);
      });

    });

    describe('#closeFile()', () => {

      it('should close the widgets associated with a given path', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          let clone = manager.cloneWidget(widget);
          let called = 0;

          widget.disposed.connect(() => {
            if (called++) {
              done();
            }
          });
          clone.disposed.connect(() => {
            if (called++) {
              done();
            }
          });
          let context = manager.contextForWidget(widget);
          context.ready.then(() => {
            manager.closeFile(model.path);
          });
        }).catch(done);
      });

      it('should be a no-op if there are no open files on that path', () => {
        manager.closeFile('foo');
      });

    });

    describe('#closeAll()', () => {

      it('should close all of the open documents', (done) => {
        services.contents.newUntitled({ type: 'file', ext: '.txt'}).then(model => {
          let widget = manager.createNew(model.path);
          let clone = manager.cloneWidget(widget);
          let called = 0;

          widget.disposed.connect(() => {
            if (called++) {
              done();
            }
          });
          clone.disposed.connect(() => {
            if (called++) {
              done();
            }
          });
          let context = manager.contextForWidget(widget);
          context.ready.then(() => {
            manager.closeAll();
          });
        }).catch(done);
      });

      it('should be a no-op if there are no open documents', () => {
        manager.closeAll();
      });

    });

  });

});
