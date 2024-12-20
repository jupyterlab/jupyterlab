// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ABCWidgetFactory,
  Base64ModelFactory,
  Context,
  DocumentModel,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { createFileContextWithMockedServices } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { sleep } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

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

function createFactory(): WidgetFactory {
  return new WidgetFactory({
    name: 'test',
    fileTypes: ['text']
  });
}

describe('docregistry/default', () => {
  describe('ABCWidgetFactory', () => {
    describe('#contentProviderId', () => {
      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          contentProviderId: 'rtc'
        });
        expect(factory.contentProviderId).toEqual('rtc');
      });
      it('should allow to set value once', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        factory.contentProviderId = 'rtc';
        expect(factory.contentProviderId).toEqual('rtc');
        expect(() => {
          factory.contentProviderId = 'test';
        }).toThrow(Error);
      });
    });

    describe('#fileTypes', () => {
      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.fileTypes).toEqual(['text']);
      });
    });

    describe('#name', () => {
      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.name).toBe('test');
      });
    });

    describe('#defaultFor', () => {
      it('should default to an empty array', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.defaultFor).toEqual([]);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          defaultFor: ['text']
        });
        expect(factory.defaultFor).toEqual(['text']);
      });
    });

    describe('#defaultRendered', () => {
      it('should default to an empty array', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.defaultRendered).toEqual([]);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          defaultRendered: ['text']
        });
        expect(factory.defaultRendered).toEqual(['text']);
      });
    });

    describe('#readOnly', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.readOnly).toBe(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          readOnly: true
        });
        expect(factory.readOnly).toBe(true);
      });
    });

    describe('#modelName', () => {
      it('should default to `text`', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.modelName).toBe('text');
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          modelName: 'notebook'
        });
        expect(factory.modelName).toBe('notebook');
      });
    });

    describe('#preferKernel', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.preferKernel).toBe(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          preferKernel: true
        });
        expect(factory.preferKernel).toBe(true);
      });
    });

    describe('#canStartKernel', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.canStartKernel).toBe(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          canStartKernel: true
        });
        expect(factory.canStartKernel).toBe(true);
      });

      it('should have toolbar items', async () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          toolbarFactory: () => [
            {
              name: 'foo',
              widget: new Widget()
            },
            {
              name: 'bar',
              widget: new Widget()
            }
          ]
        });
        const context = await createFileContextWithMockedServices();
        const widget = factory.createNew(context);
        const widget2 = factory.createNew(context);
        expect(Array.from(widget.toolbar.names())).toEqual([
          'foo',
          'bar',
          'toolbar-popup-opener'
        ]);
        expect(Array.from(widget2.toolbar.names())).toEqual([
          'foo',
          'bar',
          'toolbar-popup-opener'
        ]);
        expect(Array.from(widget.toolbar.children()).length).toBe(3);
        expect(Array.from(widget2.toolbar.children()).length).toBe(3);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory has been disposed', () => {
        const factory = createFactory();
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new widget given a document model and a context', async () => {
        const factory = createFactory();
        const context = await createFileContextWithMockedServices();
        const widget = factory.createNew(context);
        expect(widget).toBeInstanceOf(Widget);
      });

      it('should take an optional source widget for cloning', async () => {
        const factory = createFactory();
        const context = await createFileContextWithMockedServices();
        const widget = factory.createNew(context);
        const clonedWidget: IDocumentWidget = factory.createNew(
          context,
          widget
        );
        expect(clonedWidget).not.toBe(widget);
        expect(clonedWidget.hasClass('WidgetFactory')).toBe(true);
        expect(clonedWidget.context).toBe(widget.context);
      });
    });
  });

  describe('Base64ModelFactory', () => {
    describe('#name', () => {
      it('should get the name of the model type', () => {
        const factory = new Base64ModelFactory();
        expect(factory.name).toBe('base64');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new Base64ModelFactory();
        expect(factory.contentType).toBe('file');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new Base64ModelFactory();
        expect(factory.fileFormat).toBe('base64');
      });
    });
  });

  describe('DocumentModel', () => {
    describe('#constructor()', () => {
      it('should create a new document model', () => {
        const model = new DocumentModel();
        expect(model).toBeInstanceOf(DocumentModel);
      });

      it('should accept an optional language preference', () => {
        const model = new DocumentModel({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the model has been disposed', () => {
        const model = new DocumentModel();
        expect(model.isDisposed).toBe(false);
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#contentChanged', () => {
      it('should be emitted when the content of the model changes', () => {
        const model = new DocumentModel();
        let called = false;
        model.contentChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args).toBeUndefined();
          called = true;
        });
        model.fromString('foo');
        expect(called).toBe(true);
      });

      it('should not be emitted if the content does not change', () => {
        const model = new DocumentModel();
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        model.fromString('');
        expect(called).toBe(false);
      });
    });

    describe('#stateChanged', () => {
      it('should be emitted when the state of the model changes', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.name).toBe('readOnly');
          expect(args.oldValue).toBe(false);
          expect(args.newValue).toBe(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).toBe(true);
      });

      it('should not be emitted if the state does not change', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.dirty = false;
        expect(called).toBe(false);
      });
    });

    describe('#dirty', () => {
      it('should get the dirty state of the document', () => {
        const model = new DocumentModel();
        expect(model.dirty).toBe(false);
      });

      it('should emit `stateChanged` when changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.name).toBe('dirty');
          expect(args.oldValue).toBe(false);
          expect(args.newValue).toBe(true);
          called = true;
        });
        model.dirty = true;
        expect(called).toBe(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.dirty = false;
        expect(called).toBe(false);
      });
    });

    describe('#readOnly', () => {
      it('should get the read only state of the document', () => {
        const model = new DocumentModel();
        expect(model.readOnly).toBe(false);
      });

      it('should emit `stateChanged` when changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.name).toBe('readOnly');
          expect(args.oldValue).toBe(false);
          expect(args.newValue).toBe(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).toBe(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.readOnly = false;
        expect(called).toBe(false);
      });
    });

    describe('#defaultKernelName', () => {
      it('should get the default kernel name of the document', () => {
        const model = new DocumentModel();
        expect(model.defaultKernelName).toBe('');
      });
    });

    describe('defaultKernelLanguage', () => {
      it('should get the default kernel language of the document', () => {
        const model = new DocumentModel();
        expect(model.defaultKernelLanguage).toBe('');
      });

      it('should be set by the constructor arg', () => {
        const model = new DocumentModel({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the document manager', () => {
        const model = new DocumentModel();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call more than once', () => {
        const model = new DocumentModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#toString()', () => {
      it('should serialize the model to a string', () => {
        const model = new DocumentModel();
        expect(model.toString()).toBe('');
      });
    });

    describe('#fromString()', () => {
      it('should deserialize the model from a string', () => {
        const model = new DocumentModel();
        model.fromString('foo');
        expect(model.toString()).toBe('foo');
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        const model = new DocumentModel();
        const data = { foo: 1 };
        model.fromJSON(data);
        expect(model.toJSON()).toEqual(data);
      });
    });

    describe('#fromJSON()', () => {
      it('should deserialize the model from JSON', () => {
        const model = new DocumentModel();
        const data: null = null;
        model.fromJSON(data);
        expect(model.toString()).toBe('null');
      });
    });
  });

  describe('TextModelFactory', () => {
    describe('#name', () => {
      it('should get the name of the model type', () => {
        const factory = new TextModelFactory();
        expect(factory.name).toBe('text');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new TextModelFactory();
        expect(factory.contentType).toBe('file');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new TextModelFactory();
        expect(factory.fileFormat).toBe('text');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory is disposed', () => {
        const factory = new TextModelFactory();
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = new TextModelFactory();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = new TextModelFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new model', () => {
        const factory = new TextModelFactory();
        const model = factory.createNew();
        expect(model).toBeInstanceOf(DocumentModel);
      });

      it('should accept a language preference', () => {
        const factory = new TextModelFactory();
        const model = factory.createNew({ languagePreference: 'foo' });
        expect(model.defaultKernelLanguage).toBe('foo');
      });
    });

    describe('#preferredLanguage()', () => {
      it('should get the preferred kernel language given an extension', () => {
        const factory = new TextModelFactory();
        expect(factory.preferredLanguage('.py')).toBe('');
        expect(factory.preferredLanguage('.jl')).toBe('');
      });
    });
  });

  describe('DocumentWidget', () => {
    let manager: ServiceManager.IManager;

    let context: Context<DocumentRegistry.IModel>;
    let content: Widget;
    let widget: DocumentWidget;

    const setup = async () => {
      context = (await createFileContextWithMockedServices(
        false,
        manager
      )) as any;
      content = new Widget();
      widget = new DocumentWidget({ context, content });
    };

    beforeAll(async () => {
      manager = new ServiceManagerMock();
      await manager.ready;
    });

    describe('#constructor', () => {
      beforeEach(setup);

      it('should set the title for the path', () => {
        expect(widget.title.label).toBe(context.localPath);
      });

      it('should update the title when the path changes', async () => {
        const path = UUID.uuid4() + '.jl';
        await manager.contents.rename(context.path, path);
        expect(widget.title.label).toBe(path);
      });

      it('should add the dirty class when the model is dirty', async () => {
        context.model.fromString('bar');
        expect(widget.title.className).toContain('jp-mod-dirty');
      });

      it('should remove the dirty class', () => {
        context.model.dirty = true;
        context.model.dirty = true;
        expect(widget.title.className).toContain('jp-mod-dirty');
        context.model.dirty = false;
        expect(widget.title.className).not.toContain('jp-mod-dirty');
      });

      it('should store the context', () => {
        expect(widget.context).toBe(context);
      });
    });

    describe('#revealed', () => {
      beforeEach(setup);

      it('should resolve after the reveal and context ready promises', async () => {
        const thisContext = new Context({
          manager,
          factory: new TextModelFactory(),
          path: UUID.uuid4()
        });
        const x = Object.create(null);
        const reveal = sleep(300, x);
        const contextReady = Promise.all([thisContext.ready, x]);
        const widget = new DocumentWidget({
          context: thisContext,
          content,
          reveal
        });
        expect(widget.isRevealed).toBe(false);

        // Our promise should resolve before the widget reveal promise.
        expect(await Promise.race([widget.revealed, reveal])).toBe(x);
        // The context ready promise should also resolve first.
        void thisContext.initialize(true);
        expect(await Promise.race([widget.revealed, contextReady])).toEqual([
          undefined,
          x
        ]);
        // The widget.revealed promise should finally resolve.
        expect(await widget.revealed).toBeUndefined();

        thisContext.dispose();
      });
    });
  });
});
