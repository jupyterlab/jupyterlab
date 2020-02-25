// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ServiceManager } from '@jupyterlab/services';

import { Widget } from '@lumino/widgets';

import { DocumentManager } from '@jupyterlab/docmanager';

import {
  DocumentRegistry,
  TextModelFactory,
  ABCWidgetFactory,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { dismissDialog } from '@jupyterlab/testutils';

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

/**
 * A test documentWidget that maintains some state in
 * count
 */
class CloneTestWidget extends DocumentWidget {
  constructor(args: any) {
    super(args);
    this.counter = args.count;
  }
  counter: number = 0;
}

/**
 * A widget factory for CloneTestWidget widgets
 */
class WidgetFactoryWithSharedState extends ABCWidgetFactory<CloneTestWidget> {
  protected createNewWidget(
    context: DocumentRegistry.Context,
    source: CloneTestWidget
  ): CloneTestWidget {
    return new CloneTestWidget({
      context,
      content: new Widget(),
      count: source ? source.counter + 1 : 0
    });
  }
}

describe('@jupyterlab/docmanager', () => {
  let manager: DocumentManager;
  let services: ServiceManager.IManager;
  let context: DocumentRegistry.Context;
  let widget: Widget | undefined;
  const textModelFactory = new TextModelFactory();
  const widgetFactory = new WidgetFactory({
    name: 'test',
    fileTypes: ['text'],
    canStartKernel: true,
    preferKernel: true
  });
  const widgetFactoryShared = new WidgetFactoryWithSharedState({
    name: 'CloneTestWidget',
    fileTypes: []
  });

  before(() => {
    services = new ServiceManager({ standby: 'never' });
    return services.ready;
  });

  beforeEach(() => {
    const registry = new DocumentRegistry({ textModelFactory });
    registry.addWidgetFactory(widgetFactory);
    registry.addWidgetFactory(widgetFactoryShared);
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
        expect(manager).to.be.an.instanceof(DocumentManager);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the manager is disposed', () => {
        expect(manager.isDisposed).to.equal(false);
        manager.dispose();
        expect(manager.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the manager', () => {
        expect(manager.isDisposed).to.equal(false);
        manager.dispose();
        expect(manager.isDisposed).to.equal(true);
        manager.dispose();
        expect(manager.isDisposed).to.equal(true);
      });
    });

    describe('#services', () => {
      it('should get the service manager for the manager', () => {
        expect(manager.services).to.be.an.instanceof(ServiceManager);
      });
    });

    describe('#registry', () => {
      it('should get the registry used by the manager', () => {
        expect(manager.registry).to.be.an.instanceof(DocumentRegistry);
      });
    });

    describe('#open()', () => {
      it('should open a file and return the widget used to view it', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path)!;
        expect(widget.hasClass('WidgetFactory')).to.equal(true);
        await dismissDialog();
      });

      it('should start a kernel if one is given', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        const session = await services.sessions.startNew({
          name: '',
          path: model.path,
          type: 'test'
        });
        const id = session.kernel!.id;
        widget = manager.open(session.path, 'default', { id })!;
        context = manager.contextForWidget(widget)!;
        await context.ready;
        await context.sessionContext.ready;
        expect(context.sessionContext.session?.kernel).to.be.ok;
        await context.sessionContext.shutdown();
      });

      it('should not auto-start a kernel if there is none given', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path, 'default')!;
        context = manager.contextForWidget(widget)!;
        await dismissDialog();
        expect(context.sessionContext.session?.kernel).to.be.not.ok;
      });

      it('should return undefined if the factory is not found', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path, 'foo');
        expect(widget).to.be.undefined;
      });

      it('should return undefined if the factory has no model factory', async () => {
        const widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path, 'foo');
        expect(widget).to.be.undefined;
      });
    });

    describe('#createNew()', () => {
      it('should open a file and return the widget used to view it', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path)!;
        expect(widget.hasClass('WidgetFactory')).to.equal(true);
        await dismissDialog();
      });

      it('should start a kernel if one is given', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        const session = await services.sessions.startNew({
          name: '',
          path: model.path,
          type: 'test'
        });
        const id = session.kernel!.id;
        widget = manager.createNew(session.path, 'default', { id })!;
        context = manager.contextForWidget(widget)!;
        await context.ready;
        await context.sessionContext.ready;
        expect(context.sessionContext.session!.kernel!.id).to.equal(id);
        await context.sessionContext.shutdown();
      });

      it('should not start a kernel if not given', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'default')!;
        context = manager.contextForWidget(widget)!;
        await dismissDialog();
        expect(context.sessionContext.session?.kernel).to.be.not.ok;
      });

      it('should return undefined if the factory is not found', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'foo');
        expect(widget).to.be.undefined;
      });

      it('should return undefined if the factory has no model factory', async () => {
        const widgetFactory2 = new WidgetFactory({
          name: 'test',
          modelName: 'foo',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'foo');
        expect(widget).to.be.undefined;
      });
    });

    describe('#findWidget()', () => {
      it('should find a widget given a file and a widget name', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path);
        expect(manager.findWidget(model.path, 'test')).to.equal(widget);
        await dismissDialog();
      });

      it('should find a widget given a file', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path);
        expect(manager.findWidget(model.path)).to.equal(widget);
        await dismissDialog();
      });

      it('should fail to find a widget', () => {
        expect(manager.findWidget('foo')).to.be.undefined;
      });

      it('should fail to find a widget with non default factory and the default widget name', async () => {
        const widgetFactory2 = new WidgetFactory({
          name: 'test2',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'test2');
        expect(manager.findWidget(model.path)).to.be.undefined;
      });

      it('should find a widget with non default factory given a file and a null widget name', async () => {
        const widgetFactory2 = new WidgetFactory({
          name: 'test2',
          fileTypes: ['text']
        });
        manager.registry.addWidgetFactory(widgetFactory2);
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'test2');
        expect(manager.findWidget(model.path, null)).to.equal(widget);
        await dismissDialog();
      });
    });

    describe('#contextForWidget()', () => {
      it('should find the context for a widget', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path)!;
        context = manager.contextForWidget(widget)!;
        expect(context.path).to.equal(model.path);
        await dismissDialog();
      });

      it('should fail to find the context for the widget', () => {
        widget = new Widget();
        expect(manager.contextForWidget(widget)).to.be.undefined;
      });
    });

    describe('#cloneWidget()', () => {
      it('should clone the given widget', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path)!;
        const clone = manager.cloneWidget(widget)!;
        expect(manager.contextForWidget(widget)).to.equal(
          manager.contextForWidget(clone)
        );
        await dismissDialog();
      });

      it('should return undefined if the source widget is not managed', () => {
        widget = new Widget();
        expect(manager.cloneWidget(widget)).to.be.undefined;
      });

      it('should allow widget factories to have custom clone behavior', () => {
        widget = manager.createNew('foo', 'CloneTestWidget')!;
        const clonedWidget: CloneTestWidget = manager.cloneWidget(
          widget
        ) as CloneTestWidget;
        expect(clonedWidget.counter).to.equal(1);
        const newWidget: CloneTestWidget = manager.createNew(
          'bar',
          'CloneTestWidget'
        ) as CloneTestWidget;
        expect(newWidget.counter).to.equal(0);
        expect(
          (manager.cloneWidget(clonedWidget) as CloneTestWidget).counter
        ).to.equal(2);
      });
    });

    describe('#closeFile()', () => {
      it('should close the widgets associated with a given path', async () => {
        let called = 0;
        let path = '';
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        path = model.path;
        widget = manager.createNew(path)!;
        const clone = manager.cloneWidget(widget)!;

        widget.disposed.connect(() => {
          called++;
        });
        clone.disposed.connect(() => {
          called++;
        });
        await dismissDialog();
        await manager.closeFile(path);
        expect(called).to.equal(2);
      });

      it('should be a no-op if there are no open files on that path', () => {
        return manager.closeFile('foo');
      });
    });

    describe('#closeAll()', () => {
      it('should close all of the open documents', async () => {
        let called = 0;
        let path = '';
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        path = model.path;
        const widget0 = manager.createNew(path)!;
        widget0.disposed.connect(() => {
          called++;
        });
        await dismissDialog();
        const widget1 = manager.createNew(path)!;
        widget1.disposed.connect(() => {
          called++;
        });
        await dismissDialog();
        await manager.closeAll();
        expect(called).to.equal(2);
      });

      it('should be a no-op if there are no open documents', async () => {
        await manager.closeAll();
      });
    });
  });
});
