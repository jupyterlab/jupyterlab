// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager, utils
} from '@jupyterlab/services';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import {
  Context, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';

import {
  EditorWidget, EditorWidgetFactory
} from '@jupyterlab/editorwidget';


describe('editorwidget', () => {

  let factoryService = new CodeMirrorEditorFactory();
  let modelFactory = new TextModelFactory();
  let mimeTypeService = new CodeMirrorMimeTypeService();
  let context: DocumentRegistry.CodeContext;
  let manager: ServiceManager.IManager;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(done, done);
  });

  describe('EditorWidget', () => {

    let widget: EditorWidget;

    beforeEach(() => {
      let path = utils.uuid() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      widget = new EditorWidget({
        factory: options => factoryService.newDocumentEditor(options),
        mimeTypeService,
        context
      });
    });

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {

      it('should create an editor widget', () => {
        expect(widget).to.be.an(EditorWidget);
      });

      it('should update the editor text when the model changes', (done) => {
        context.save().catch(done);
        context.ready.then(() => {
          widget.context.model.fromString('foo');
          expect(widget.editor.model.value.text).to.be('foo');
        }).then(done, done);
      });

      it('should set the mime type for the path', () => {
        expect(widget.editor.model.mimeType).to.be('text/x-python');
      });

      it('should update the mime type when the path changes', (done) => {
        context.pathChanged.connect((sender, args) => {
          expect(widget.editor.model.mimeType).to.be('text/x-julia');
          done();
        });
        context.save().then(() => {
          return manager.contents.rename(context.path, utils.uuid() + '.jl');
        }).catch(done);
      });

      it('should set the title for the path', () => {
        expect(widget.title.label).to.be(context.path);
      });

      it('should add the dirty class when the model is dirty', (done) => {
        context.save().catch(done);
        context.ready.then(() => {
          context.model.fromString('bar');
          expect(widget.title.className).to.contain('jp-mod-dirty');
        }).then(done, done);
      });

      it('should update the title when the path changes', (done) => {
        let path = utils.uuid() + '.jl';
        context.pathChanged.connect((sender, args) => {
          expect(widget.title.label).to.be(path);
          done();
        });
        context.save().then(() => {
          return manager.contents.rename(context.path, path);
        }).catch(done);
      });

    });

    describe('#context', () => {

      it('should be the context used by the widget', () => {
        expect(widget.context).to.be(context);
      });

    });

  });

  describe('EditorWidgetFactory', () => {

    let widgetFactory = new EditorWidgetFactory({
      editorServices: {
        factoryService,
        mimeTypeService
      },
      factoryOptions: {
        name: 'editor',
        fileExtensions: ['*'],
        defaultFor: ['*']
      }
    });

    describe('#constructor()', () => {

      it('should create an EditorWidgetFactory', () => {
        expect(widgetFactory).to.be.an(EditorWidgetFactory);
      });

    });

    describe('#createNewWidget()', () => {

      it('should create an editor widget', () => {
        expect(widgetFactory.createNew(context)).to.be.an(EditorWidget);
      });

    });

  });

});
