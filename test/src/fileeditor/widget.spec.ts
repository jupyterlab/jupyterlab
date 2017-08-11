// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import {
  Context, DocumentRegistry, TextModelFactory
} from '@jupyterlab/docregistry';

import {
  FileEditor, FileEditorFactory
} from '@jupyterlab/fileeditor';


describe('fileeditor', () => {

  let factoryService = new CodeMirrorEditorFactory();
  let modelFactory = new TextModelFactory();
  let mimeTypeService = new CodeMirrorMimeTypeService();
  let context: DocumentRegistry.CodeContext;
  let manager: ServiceManager.IManager;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(done, done);
  });

  describe('FileEditor', () => {

    let widget: FileEditor;

    beforeEach(() => {
      let path = uuid() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      widget = new FileEditor({
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
        expect(widget).to.be.an(FileEditor);
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
          return manager.contents.rename(context.path, uuid() + '.jl');
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
        let path = uuid() + '.jl';
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

  describe('FileEditorFactory', () => {

    let widgetFactory = new FileEditorFactory({
      editorServices: {
        factoryService,
        mimeTypeService
      },
      factoryOptions: {
        name: 'editor',
        fileTypes: ['*'],
        defaultFor: ['*']
      }
    });

    describe('#constructor()', () => {

      it('should create an FileEditorFactory', () => {
        expect(widgetFactory).to.be.an(FileEditorFactory);
      });

    });

    describe('#createNewWidget()', () => {

      it('should create an editor widget', () => {
        expect(widgetFactory.createNew(context)).to.be.an(FileEditor);
      });

    });

  });

});
