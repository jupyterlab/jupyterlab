// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorLanguageRegistry
} from '@jupyterlab/codemirror';
import {
  Context,
  DocumentRegistry,
  DocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import {
  FileEditor,
  FileEditorFactory,
  FileEditorWidget
} from '@jupyterlab/fileeditor';
import { ServiceManager } from '@jupyterlab/services';
import { framePromise } from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

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
  const factoryService = new CodeMirrorEditorFactory();
  const modelFactory = new TextModelFactory();
  const languages = (() => {
    const registry = new EditorLanguageRegistry();
    EditorLanguageRegistry.getDefaultLanguages()
      .filter(language => ['Julia', 'Python'].includes(language.name))
      .forEach(language => {
        registry.addLanguage(language);
      });
    return registry;
  })();
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  let context: Context<DocumentRegistry.ICodeModel>;
  let manager: ServiceManager.IManager;

  beforeAll(() => {
    manager = new ServiceManagerMock();
    return manager.ready;
  });

  describe('FileEditor', () => {
    let widget: LogFileEditor;

    beforeEach(() => {
      const path = UUID.uuid4() + '.py';
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
        expect(widget).toBeInstanceOf(FileEditor);
      });

      it('should update the editor text when the model changes', async () => {
        await context.initialize(true);
        await context.ready;
        widget.context.model.fromString('foo');
        expect(widget.editor.model.sharedModel.getSource()).toBe('foo');
      });

      it('should set the mime type for the path', () => {
        expect(widget.editor.model.mimeType).toBe('text/x-python');
      });

      it('should update the mime type when the path changes', async () => {
        let called = false;
        context.pathChanged.connect((sender, args) => {
          expect(widget.editor.model.mimeType).toBe('text/x-julia');
          called = true;
        });
        await context.initialize(true);
        await manager.contents.rename(context.path, UUID.uuid4() + '.jl');
        expect(called).toBe(true);
      });
    });

    describe('#context', () => {
      it('should be the context used by the widget', () => {
        expect(widget.context).toBe(context);
      });
    });

    describe('#handleEvent()', () => {
      beforeEach(() => {
        Widget.attach(widget, document.body);
        return framePromise();
      });

      afterEach(() => {
        widget.dispose();
      });

      describe('mousedown', () => {
        it('should focus the editor', () => {
          simulate(widget.node, 'mousedown');
          expect(widget.events).toContain('mousedown');
          expect(widget.editor.hasFocus()).toBe(true);
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should add event listeners', async () => {
        Widget.attach(widget, document.body);
        await framePromise();
        expect(widget.methods).toContain('onAfterAttach');
        simulate(widget.node, 'mousedown');
        expect(widget.events).toContain('mousedown');
      });
    });

    describe('#onBeforeDetach()', () => {
      it('should remove event listeners', async () => {
        Widget.attach(widget, document.body);
        await framePromise();
        Widget.detach(widget);
        expect(widget.methods).toContain('onBeforeDetach');
        widget.events = [];
        simulate(widget.node, 'mousedown');
        expect(widget.events).not.toContain('mousedown');
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the node after an update', async () => {
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).toContain('onActivateRequest');
        await framePromise();
        expect(widget.editor.hasFocus()).toBe(true);
      });
    });

    describe('#ready', () => {
      it('should resolve after initialization', async () => {
        await context.initialize(true);
        return expect(widget.ready).resolves.toBe(undefined);
      });
    });
  });

  describe('FileEditorWidget', () => {
    let documentWidget: FileEditorWidget;

    beforeEach(() => {
      const path = UUID.uuid4() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      context.model.sharedModel.setSource('a\nb\nc');
      const content = new FileEditor({
        factory: options => factoryService.newDocumentEditor(options),
        mimeTypeService,
        context
      });
      documentWidget = new FileEditorWidget({ content, context });
    });

    afterEach(() => {
      documentWidget.dispose();
    });

    describe('#setFragment', () => {
      it('should set fragment for a single line', async () => {
        await context.initialize(true);
        await context.ready;
        const widget = documentWidget.content;

        await documentWidget.setFragment('#line=2');
        let cursor = widget.editor.getCursorPosition();
        expect(cursor.line).toBe(2);

        await documentWidget.setFragment('#line=0');
        cursor = widget.editor.getCursorPosition();
        expect(cursor.line).toBe(0);
      });
      it('should set fragment for a range', async () => {
        await context.initialize(true);
        await context.ready;
        const widget = documentWidget.content;

        await documentWidget.setFragment('#line=,3');
        let cursor = widget.editor.getCursorPosition();
        expect(cursor.line).toBe(0);

        await documentWidget.setFragment('#line=2,3');
        cursor = widget.editor.getCursorPosition();
        expect(cursor.line).toBe(2);
      });
    });
  });

  describe('FileEditorFactory', () => {
    const widgetFactory = new FileEditorFactory({
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
        expect(widgetFactory).toBeInstanceOf(FileEditorFactory);
      });
    });

    describe('#createNewWidget()', () => {
      it('should create a document widget', () => {
        const d = widgetFactory.createNew(context);
        expect(d).toBeInstanceOf(DocumentWidget);
        expect(d.content).toBeInstanceOf(FileEditor);
      });
    });
  });
});
