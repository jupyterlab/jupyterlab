// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@lumino/algorithm';

import { UUID } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import {
  ABCWidgetFactory,
  Base64ModelFactory,
  DocumentModel,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory,
  Context
} from '@jupyterlab/docregistry';

import { ServiceManager } from '@jupyterlab/services';

import { createFileContext, sleep } from '@jupyterlab/testutils';

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
    describe('#fileTypes', () => {
      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.fileTypes).to.deep.equal(['text']);
      });
    });

    describe('#name', () => {
      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.name).to.equal('test');
      });
    });

    describe('#defaultFor', () => {
      it('should default to an empty array', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.defaultFor).to.deep.equal([]);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          defaultFor: ['text']
        });
        expect(factory.defaultFor).to.deep.equal(['text']);
      });
    });

    describe('#defaultRendered', () => {
      it('should default to an empty array', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.defaultRendered).to.deep.equal([]);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          defaultRendered: ['text']
        });
        expect(factory.defaultRendered).to.deep.equal(['text']);
      });
    });

    describe('#readOnly', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.readOnly).to.equal(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          readOnly: true
        });
        expect(factory.readOnly).to.equal(true);
      });
    });

    describe('#modelName', () => {
      it('should default to `text`', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.modelName).to.equal('text');
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          modelName: 'notebook'
        });
        expect(factory.modelName).to.equal('notebook');
      });
    });

    describe('#preferKernel', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.preferKernel).to.equal(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          preferKernel: true
        });
        expect(factory.preferKernel).to.equal(true);
      });
    });

    describe('#canStartKernel', () => {
      it('should default to false', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text']
        });
        expect(factory.canStartKernel).to.equal(false);
      });

      it('should be the value passed in', () => {
        const factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          canStartKernel: true
        });
        expect(factory.canStartKernel).to.equal(true);
      });

      it('should have toolbar items', () => {
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
        const context = createFileContext();
        const widget = factory.createNew(context);
        const widget2 = factory.createNew(context);
        expect(toArray(widget.toolbar.names())).to.deep.equal(['foo', 'bar']);
        expect(toArray(widget2.toolbar.names())).to.deep.equal(['foo', 'bar']);
        expect(toArray(widget.toolbar.children()).length).to.equal(2);
        expect(toArray(widget2.toolbar.children()).length).to.equal(2);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory has been disposed', () => {
        const factory = createFactory();
        expect(factory.isDisposed).to.equal(false);
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new widget given a document model and a context', () => {
        const factory = createFactory();
        const context = createFileContext();
        const widget = factory.createNew(context);
        expect(widget).to.be.an.instanceof(Widget);
      });

      it('should take an optional source widget for cloning', () => {
        const factory = createFactory();
        const context = createFileContext();
        const widget = factory.createNew(context);
        const clonedWidget: IDocumentWidget = factory.createNew(
          context,
          widget
        );
        expect(clonedWidget).to.not.equal(widget);
        expect(clonedWidget.hasClass('WidgetFactory')).to.be.true;
        expect(clonedWidget.context).to.equal(widget.context);
      });
    });
  });

  describe('Base64ModelFactory', () => {
    describe('#name', () => {
      it('should get the name of the model type', () => {
        const factory = new Base64ModelFactory();
        expect(factory.name).to.equal('base64');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new Base64ModelFactory();
        expect(factory.contentType).to.equal('file');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new Base64ModelFactory();
        expect(factory.fileFormat).to.equal('base64');
      });
    });
  });

  describe('DocumentModel', () => {
    describe('#constructor()', () => {
      it('should create a new document model', () => {
        const model = new DocumentModel();
        expect(model).to.be.an.instanceof(DocumentModel);
      });

      it('should accept an optional language preference', () => {
        const model = new DocumentModel('foo');
        expect(model.defaultKernelLanguage).to.equal('foo');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the model has been disposed', () => {
        const model = new DocumentModel();
        expect(model.isDisposed).to.equal(false);
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });
    });

    describe('#contentChanged', () => {
      it('should be emitted when the content of the model changes', () => {
        const model = new DocumentModel();
        let called = false;
        model.contentChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args).to.be.undefined;
          called = true;
        });
        model.fromString('foo');
        expect(called).to.equal(true);
      });

      it('should not be emitted if the content does not change', () => {
        const model = new DocumentModel();
        let called = false;
        model.contentChanged.connect(() => {
          called = true;
        });
        model.fromString('');
        expect(called).to.equal(false);
      });
    });

    describe('#stateChanged', () => {
      it('should be emitted when the state of the model changes', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.name).to.equal('readOnly');
          expect(args.oldValue).to.equal(false);
          expect(args.newValue).to.equal(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.equal(true);
      });

      it('should not be emitted if the state does not change', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.dirty = false;
        expect(called).to.equal(false);
      });
    });

    describe('#dirty', () => {
      it('should get the dirty state of the document', () => {
        const model = new DocumentModel();
        expect(model.dirty).to.equal(false);
      });

      it('should emit `stateChanged` when changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.name).to.equal('dirty');
          expect(args.oldValue).to.equal(false);
          expect(args.newValue).to.equal(true);
          called = true;
        });
        model.dirty = true;
        expect(called).to.equal(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.dirty = false;
        expect(called).to.equal(false);
      });
    });

    describe('#readOnly', () => {
      it('should get the read only state of the document', () => {
        const model = new DocumentModel();
        expect(model.readOnly).to.equal(false);
      });

      it('should emit `stateChanged` when changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.equal(model);
          expect(args.name).to.equal('readOnly');
          expect(args.oldValue).to.equal(false);
          expect(args.newValue).to.equal(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.equal(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        const model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => {
          called = true;
        });
        model.readOnly = false;
        expect(called).to.equal(false);
      });
    });

    describe('#defaultKernelName', () => {
      it('should get the default kernel name of the document', () => {
        const model = new DocumentModel();
        expect(model.defaultKernelName).to.equal('');
      });
    });

    describe('defaultKernelLanguage', () => {
      it('should get the default kernel language of the document', () => {
        const model = new DocumentModel();
        expect(model.defaultKernelLanguage).to.equal('');
      });

      it('should be set by the constructor arg', () => {
        const model = new DocumentModel('foo');
        expect(model.defaultKernelLanguage).to.equal('foo');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the document manager', () => {
        const model = new DocumentModel();
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });

      it('should be safe to call more than once', () => {
        const model = new DocumentModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.equal(true);
      });
    });

    describe('#toString()', () => {
      it('should serialize the model to a string', () => {
        const model = new DocumentModel();
        expect(model.toString()).to.equal('');
      });
    });

    describe('#fromString()', () => {
      it('should deserialize the model from a string', () => {
        const model = new DocumentModel();
        model.fromString('foo');
        expect(model.toString()).to.equal('foo');
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        const model = new DocumentModel();
        const data = { foo: 1 };
        model.fromJSON(data);
        expect(model.toJSON()).to.deep.equal(data);
      });
    });

    describe('#fromJSON()', () => {
      it('should deserialize the model from JSON', () => {
        const model = new DocumentModel();
        const data: null = null;
        model.fromJSON(data);
        expect(model.toString()).to.equal('null');
      });
    });
  });

  describe('TextModelFactory', () => {
    describe('#name', () => {
      it('should get the name of the model type', () => {
        const factory = new TextModelFactory();
        expect(factory.name).to.equal('text');
      });
    });

    describe('#contentType', () => {
      it('should get the file type', () => {
        const factory = new TextModelFactory();
        expect(factory.contentType).to.equal('file');
      });
    });

    describe('#fileFormat', () => {
      it('should get the file format', () => {
        const factory = new TextModelFactory();
        expect(factory.fileFormat).to.equal('text');
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory is disposed', () => {
        const factory = new TextModelFactory();
        expect(factory.isDisposed).to.equal(false);
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = new TextModelFactory();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = new TextModelFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#createNew()', () => {
      it('should create a new model', () => {
        const factory = new TextModelFactory();
        const model = factory.createNew();
        expect(model).to.be.an.instanceof(DocumentModel);
      });

      it('should accept a language preference', () => {
        const factory = new TextModelFactory();
        const model = factory.createNew('foo');
        expect(model.defaultKernelLanguage).to.equal('foo');
      });
    });

    describe('#preferredLanguage()', () => {
      it('should get the preferred kernel language given an extension', () => {
        const factory = new TextModelFactory();
        expect(factory.preferredLanguage('.py')).to.equal('python');
        expect(factory.preferredLanguage('.jl')).to.equal('julia');
      });
    });
  });

  describe('DocumentWidget', () => {
    let manager: ServiceManager.IManager;

    let context: Context<DocumentRegistry.IModel>;
    let content: Widget;
    let widget: DocumentWidget;

    const setup = () => {
      context = createFileContext(undefined, manager);
      content = new Widget();
      widget = new DocumentWidget({ context, content });
    };

    beforeAll(async () => {
      manager = new ServiceManager({ standby: 'never' });
      await manager.ready;
    });

    describe('#constructor', () => {
      beforeEach(setup);

      it('should set the title for the path', () => {
        expect(widget.title.label).to.equal(context.localPath);
      });

      it('should update the title when the path changes', async () => {
        const path = UUID.uuid4() + '.jl';
        await context.initialize(true);
        await manager.contents.rename(context.path, path);
        expect(widget.title.label).to.equal(path);
      });

      it('should add the dirty class when the model is dirty', async () => {
        await context.initialize(true);
        await context.ready;
        context.model.fromString('bar');
        expect(widget.title.className).to.contain('jp-mod-dirty');
      });

      it('should store the context', () => {
        expect(widget.context).to.equal(context);
      });
    });

    describe('#revealed', () => {
      beforeEach(setup);

      it('should resolve after the reveal and context ready promises', async () => {
        const x = Object.create(null);
        const reveal = sleep(300, x);
        const contextReady = Promise.all([context.ready, x]);
        const widget = new DocumentWidget({ context, content, reveal });
        expect(widget.isRevealed).to.equal(false);

        // Our promise should resolve before the widget reveal promise.
        expect(await Promise.race([widget.revealed, reveal])).to.equal(x);
        // The context ready promise should also resolve first.
        void context.initialize(true);
        expect(
          await Promise.race([widget.revealed, contextReady])
        ).to.deep.equal([undefined, x]);
        // The widget.revealed promise should finally resolve.
        expect(await widget.revealed).to.be.undefined;
      });
    });
  });
});
