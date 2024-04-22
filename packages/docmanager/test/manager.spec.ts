// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { dismissDialog } from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Widget } from '@lumino/widgets';
import { DocumentManager } from '../src';

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

  beforeAll(() => {
    services = new ServiceManagerMock();
  });

  beforeEach(() => {
    const opener = new DocumentWidgetOpenerMock();
    const registry = new DocumentRegistry({ textModelFactory });
    registry.addWidgetFactory(widgetFactory);
    registry.addWidgetFactory(widgetFactoryShared);
    DocumentRegistry.getDefaultFileTypes().forEach(ft => {
      registry.addFileType(ft);
    });
    manager = new DocumentManager({
      registry,
      manager: services,
      opener
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('DocumentWidgetManager', () => {
    describe('#constructor()', () => {
      it('should create a new document manager', () => {
        expect(manager).toBeInstanceOf(DocumentManager);
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

    describe('#services', () => {
      it('should get the service manager for the manager', async () => {
        await expect(manager.services.ready).resolves.not.toThrow();
      });
    });

    describe('#registry', () => {
      it('should get the registry used by the manager', () => {
        expect(manager.registry).toBeInstanceOf(DocumentRegistry);
      });
    });

    describe('#open()', () => {
      it('should open a file and return the widget used to view it', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path)!;
        expect(widget.hasClass('WidgetFactory')).toBe(true);
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
        expect(context.sessionContext.session?.kernel).toBeTruthy();
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
        expect(context.sessionContext.session?.kernel).toBeFalsy();
      });

      it('should return undefined if the factory is not found', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.open(model.path, 'foo');
        expect(widget).toBeUndefined();
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
        expect(widget).toBeUndefined();
      });
    });

    describe('#createNew()', () => {
      it('should open a file and return the widget used to view it', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path)!;
        expect(widget.hasClass('WidgetFactory')).toBe(true);
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
        expect(context.sessionContext.session!.kernel!.id).toBe(id);
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
        expect(context.sessionContext.session?.kernel).toBeFalsy();
      });

      it('should return undefined if the factory is not found', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path, 'foo');
        expect(widget).toBeUndefined();
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
        expect(widget).toBeUndefined();
      });
    });

    describe('#findWidget()', () => {
      it('should find a widget given a file and a widget name', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path);
        expect(manager.findWidget(model.path, 'test')).toBe(widget);
        await dismissDialog();
      });

      it('should find a widget given a file', async () => {
        const model = await services.contents.newUntitled({
          type: 'file',
          ext: '.txt'
        });
        widget = manager.createNew(model.path);
        expect(manager.findWidget(model.path)).toBe(widget);
        await dismissDialog();
      });

      it('should fail to find a widget', () => {
        expect(manager.findWidget('foo')).toBeUndefined();
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
        expect(manager.findWidget(model.path)).toBeUndefined();
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
        expect(manager.findWidget(model.path, null)).toBe(widget);
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
        expect(context.path).toBe(model.path);
        await dismissDialog();
      });

      it('should fail to find the context for the widget', () => {
        widget = new Widget();
        expect(manager.contextForWidget(widget)).toBeUndefined();
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
        expect(manager.contextForWidget(widget)).toBe(
          manager.contextForWidget(clone)
        );
        await dismissDialog();
      });

      it('should return undefined if the source widget is not managed', () => {
        widget = new Widget();
        expect(manager.cloneWidget(widget)).toBeUndefined();
      });

      it('should allow widget factories to have custom clone behavior', () => {
        widget = manager.createNew('foo', 'CloneTestWidget')!;
        const clonedWidget: CloneTestWidget = manager.cloneWidget(
          widget
        ) as CloneTestWidget;
        expect(clonedWidget.counter).toBe(1);
        const newWidget: CloneTestWidget = manager.createNew(
          'bar',
          'CloneTestWidget'
        ) as CloneTestWidget;
        expect(newWidget.counter).toBe(0);
        expect(
          (manager.cloneWidget(clonedWidget) as CloneTestWidget).counter
        ).toBe(2);
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
        expect(called).toBe(2);
      });

      it('should be a no-op if there are no open files on that path', async () => {
        await expect(manager.closeFile('foo')).resolves.not.toThrow();
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
        expect(called).toBe(2);
      });

      it('should be a no-op if there are no open documents', async () => {
        await expect(manager.closeAll()).resolves.not.toThrow();
      });
    });
  });
});
