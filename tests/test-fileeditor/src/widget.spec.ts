// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  MessageLoop, Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

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
  Context, DocumentRegistry, TextModelFactory, DocumentWidget
} from '@jupyterlab/docregistry';

import {
  FileEditor, FileEditorCodeWrapper, FileEditorFactory
} from '@jupyterlab/fileeditor';

class LogFileEditor extends FileEditor {

    events: string[] = [];

    methods: string[] = [];

    handleEvent(event: Event): void {
      this.events.push(event.type);
      super.handleEvent(event);
    }

    protected onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      this.methods.push('onAfterAttach');
    }

    protected onBeforeDetach(msg: Message): void {
      super.onBeforeDetach(msg);
      this.methods.push('onBeforeDetach');
    }

    protected onActivateRequest(msg: Message): void {
      super.onActivateRequest(msg);
      this.methods.push('onActivateRequest');
    }
  }


describe('fileeditorcodewrapper', () => {

  let factoryService = new CodeMirrorEditorFactory();
  let modelFactory = new TextModelFactory();
  let mimeTypeService = new CodeMirrorMimeTypeService();
  let context: Context<DocumentRegistry.ICodeModel>;
  let manager: ServiceManager.IManager;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(done, done);
  });

  describe('FileEditorCodeWrapper', () => {

    let widget: FileEditorCodeWrapper;

    beforeEach(() => {
      let path = uuid() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      widget = new FileEditorCodeWrapper({
        factory: options => factoryService.newDocumentEditor(options),
        mimeTypeService,
        context
      });
    });

    afterEach(() => {
      widget.dispose();
    });

    describe('#constructor()', () => {

      it('should create an editor wrapper widget', () => {
        expect(widget).to.be.an(FileEditorCodeWrapper);
      });

      it('should update the editor text when the model changes', (done) => {
        context.initialize(true).catch(done);
        context.ready.then(() => {
          widget.context.model.fromString('foo');
          expect(widget.editor.model.value.text).to.be('foo');
        }).then(done, done);
      });

    });

    describe('#context', () => {

      it('should be the context used by the widget', () => {
        expect(widget.context).to.be(context);
      });

    });

  });


  describe('FileEditor', () => {

    let widget: LogFileEditor;

    beforeEach(() => {
      let path = uuid() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      widget = new LogFileEditor({
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
        context.initialize(true).catch(done);
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
        context.initialize(true).then(() => {
          return manager.contents.rename(context.path, uuid() + '.jl');
        }).catch(done);
      });

    });

    describe('#context', () => {

      it('should be the context used by the widget', () => {
        expect(widget.context).to.be(context);
      });

    });

    describe('#handleEvent()', () => {

      beforeEach((done) => {
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => { done(); });
      });

      afterEach(() => {
        widget.dispose();
      });

      describe('mousedown', () => {

        it('should focus the editor', () => {
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          expect(widget.editor.hasFocus()).to.be(true);
        });

      });

    });


    describe('#onAfterAttach()', () => {

      it('should add event listeners', (done) => {
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onAfterAttach');
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.contain('mousedown');
          done();
        });
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', (done) => {
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          Widget.detach(widget);
          expect(widget.methods).to.contain('onBeforeDetach');
          widget.events = [];
          simulate(widget.node, 'mousedown');
          expect(widget.events).to.not.contain('mousedown');
          done();
        });
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the node after an update', (done) => {
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        requestAnimationFrame(() => {
          expect(widget.editor.hasFocus()).to.be(true);
          done();
        });
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

      it('should create a document widget', () => {
        const d = widgetFactory.createNew(context);
        expect(d).to.be.a(DocumentWidget);
        expect(d.content).to.be.a(FileEditor);
      });

    });

  });

});
