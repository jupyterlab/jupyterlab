// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  UUID
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  ABCWidgetFactory, Base64ModelFactory, DocumentModel,
  DocumentRegistry, DocumentWidget, IDocumentWidget, TextModelFactory, Context
} from '@jupyterlab/docregistry';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  createFileContext, sleep
} from '../../utils';


class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {

  protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget {
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
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.fileTypes).to.eql(['text']);
      });

    });

    describe('#name', () => {

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.name).to.be('test');
      });

    });

    describe('#defaultFor', () => {

      it('should default to an empty array', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.defaultFor).to.eql([]);
      });

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          defaultFor: ['text']
        });
        expect(factory.defaultFor).to.eql(['text']);
      });

    });

    describe('#readOnly', () => {

      it('should default to false', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.readOnly).to.be(false);
      });

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          readOnly: true
        });
        expect(factory.readOnly).to.be(true);
      });

    });

    describe('#modelName', () => {

      it('should default to `text`', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.modelName).to.be('text');
      });

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          modelName: 'notebook'
        });
        expect(factory.modelName).to.be('notebook');
      });
    });

    describe('#preferKernel', () => {

      it('should default to false', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.preferKernel).to.be(false);
      });

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          preferKernel: true
        });
        expect(factory.preferKernel).to.be(true);
      });

    });

    describe('#canStartKernel', () => {

      it('should default to false', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
        });
        expect(factory.canStartKernel).to.be(false);
      });

      it('should be the value passed in', () => {
        let factory = new WidgetFactory({
          name: 'test',
          fileTypes: ['text'],
          canStartKernel: true
        });
        expect(factory.canStartKernel).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory has been disposed', () => {
        let factory = createFactory();
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the factory', () => {
        let factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new widget given a document model and a context', () => {
        let factory = createFactory();
        let context = createFileContext();
        let widget = factory.createNew(context);
        expect(widget).to.be.a(Widget);
      });

    });

  });

  describe('Base64ModelFactory', () => {

    describe('#name', () => {

      it('should get the name of the model type', () => {
        let factory = new Base64ModelFactory();
        expect(factory.name).to.be('base64');
      });

    });

    describe('#contentType', () => {

      it('should get the file type', () => {
        let factory = new Base64ModelFactory();
        expect(factory.contentType).to.be('file');
      });

    });

    describe('#fileFormat', () => {

      it('should get the file format', () => {
        let factory = new Base64ModelFactory();
        expect(factory.fileFormat).to.be('base64');
      });

    });

  });

  describe('DocumentModel', () => {

    describe('#constructor()', () => {

      it('should create a new document model', () => {
        let model = new DocumentModel();
        expect(model).to.be.a(DocumentModel);
      });

      it('should accept an optional language preference', () => {
        let model = new DocumentModel('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the model has been disposed', () => {
        let model = new DocumentModel();
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#contentChanged', () => {

      it('should be emitted when the content of the model changes', () => {
        let model = new DocumentModel();
        let called = false;
        model.contentChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args).to.be(void 0);
          called = true;
        });
        model.fromString('foo');
        expect(called).to.be(true);
      });

      it('should not be emitted if the content does not change', () => {
        let model = new DocumentModel();
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        model.fromString('');
        expect(called).to.be(false);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state of the model changes', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('readOnly');
          expect(args.oldValue).to.be(false);
          expect(args.newValue).to.be(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.be(true);
      });

      it('should not be emitted if the state does not change', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dirty = false;
        expect(called).to.be(false);
      });

    });

    describe('#dirty', () => {

      it('should get the dirty state of the document', () => {
        let model = new DocumentModel();
        expect(model.dirty).to.be(false);
      });

      it('should emit `stateChanged` when changed', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('dirty');
          expect(args.oldValue).to.be(false);
          expect(args.newValue).to.be(true);
          called = true;
        });
        model.dirty = true;
        expect(called).to.be(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dirty = false;
        expect(called).to.be(false);
      });

    });

    describe('#readOnly', () => {

      it('should get the read only state of the document', () => {
        let model = new DocumentModel();
        expect(model.readOnly).to.be(false);
      });

      it('should emit `stateChanged` when changed', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('readOnly');
          expect(args.oldValue).to.be(false);
          expect(args.newValue).to.be(true);
          called = true;
        });
        model.readOnly = true;
        expect(called).to.be(true);
      });

      it('should not emit `stateChanged` when not changed', () => {
        let model = new DocumentModel();
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.readOnly = false;
        expect(called).to.be(false);
      });

    });

    describe('#defaultKernelName', () => {

      it('should get the default kernel name of the document', () => {
        let model = new DocumentModel();
        expect(model.defaultKernelName).to.be('');
      });

    });

    describe('defaultKernelLanguage', () => {

      it('should get the default kernel langauge of the document', () => {
        let model = new DocumentModel();
        expect(model.defaultKernelLanguage).to.be('');
      });

      it('should be set by the constructor arg', () => {
        let model = new DocumentModel('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the document manager', () => {
        let model = new DocumentModel();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let model = new DocumentModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#toString()', () => {

      it('should serialize the model to a string', () => {
        let model = new DocumentModel();
        expect(model.toString()).to.be('');
      });

    });

    describe('#fromString()', () => {

      it('should deserialize the model from a string', () => {
        let model = new DocumentModel();
        model.fromString('foo');
        expect(model.toString()).to.be('foo');
      });

    });

    describe('#toJSON()', () => {

      it('should serialize the model to JSON', () => {
        let model = new DocumentModel();
        let data = { 'foo': 1 };
        model.fromJSON(data);
        expect(model.toJSON()).to.eql(data);
      });

    });

    describe('#fromJSON()', () => {

      it('should deserialize the model from JSON', () => {
        let model = new DocumentModel();
        let data = null;
        model.fromJSON(data);
        expect(model.toString()).to.be('null');
      });

    });

  });

  describe('TextModelFactory', () => {

    describe('#name', () => {

      it('should get the name of the model type', () => {
        let factory = new TextModelFactory();
        expect(factory.name).to.be('text');
      });

    });

    describe('#contentType', () => {

      it('should get the file type', () => {
        let factory = new TextModelFactory();
        expect(factory.contentType).to.be('file');
      });

    });

    describe('#fileFormat', () => {

      it('should get the file format', () => {
        let factory = new TextModelFactory();
        expect(factory.fileFormat).to.be('text');
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the factory is disposed', () => {
        let factory = new TextModelFactory();
        expect(factory.isDisposed).to.be(false);
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the factory', () => {
        let factory = new TextModelFactory();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let factory = new TextModelFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.be(true);
      });

    });

    describe('#createNew()', () => {

      it('should create a new model', () => {
        let factory = new TextModelFactory();
        let model = factory.createNew();
        expect(model).to.be.a(DocumentModel);
      });

      it('should accept a language preference', () => {
        let factory = new TextModelFactory();
        let model = factory.createNew('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

    });

    describe('#preferredLanguage()', () => {

      it('should get the preferred kernel language given an extension', () => {
        let factory = new TextModelFactory();
        expect(factory.preferredLanguage('.py')).to.be('python');
        expect(factory.preferredLanguage('.jl')).to.be('julia');
      });

    });

  });

  describe('DocumentWidget', () => {

    let manager: ServiceManager.IManager;

    let context: Context<DocumentRegistry.IModel>;
    let content: Widget;
    let widget: DocumentWidget;

    let setup = () => {
      context = createFileContext(undefined, manager);
      content = new Widget();
      widget = new DocumentWidget({ context, content });
    };

    before(async () => {
      manager = new ServiceManager();
      await manager.ready;
    });

    describe('#constructor', () => {
      beforeEach(setup);

      it('should set the title for the path', () => {
        expect(widget.title.label).to.be(context.localPath);
      });

      it('should update the title when the path changes', async () => {
        let path = UUID.uuid4() + '.jl';
        await context.initialize(true);
        await manager.contents.rename(context.path, path);
        expect(widget.title.label).to.be(path);
      });

      it('should add the dirty class when the model is dirty', async () => {
        await context.initialize(true);
        await context.ready;
        context.model.fromString('bar');
        expect(widget.title.className).to.contain('jp-mod-dirty');
      });

      it('should store the context', () => {
        expect(widget.context).to.be(context);
      });

    });

    describe('#revealed', () => {
      beforeEach(setup);

      it('should resolve after the reveal and context ready promises', async () => {
        let x = Object.create(null);
        let reveal = sleep(300, x);
        let contextReady = Promise.all([context.ready, x]);
        let widget = new DocumentWidget({ context, content, reveal});
        expect(widget.isRevealed).to.be(false);

        // Our promise should resolve before the widget reveal promise.
        expect(await Promise.race([widget.revealed, reveal])).to.be(x);
        // The context ready promise should also resolve first.
        context.initialize(true);
        expect(await Promise.race([widget.revealed, contextReady])).to.eql([undefined, x]);
        // The widget.revealed promise should finally resolve.
        expect(await widget.revealed).to.be(undefined);
      });

    });

  });



});

