// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/apputils';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorLanguageRegistry
} from '@jupyterlab/codemirror';

import type { DocumentRegistry } from '@jupyterlab/docregistry';

import { Context, TextModelFactory } from '@jupyterlab/docregistry';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import { FileEditor, FileEditorWidget } from '@jupyterlab/fileeditor';

import type { Session } from '@jupyterlab/services';

import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { JupyterServer, signalToPromise, sleep } from '@jupyterlab/testing';

import { UUID } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { Debugger } from '../src/debugger';

import { DebuggerHandler } from '../src/handler';

import { DebuggerService } from '../src/service';

/**
 * A minimal stand-in for a document widget: a real Lumino widget, so that
 * `disposed` and `Signal.clearData` behave as in the application, with the
 * toolbar the handler adds its button to.
 */
class TestDocumentWidget extends Widget {
  constructor() {
    super();
    this.id = UUID.uuid4();
  }
  toolbar = new Toolbar();
}

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('DebuggerHandler', () => {
  let connection: Session.ISessionConnection;
  let service: DebuggerService;
  let handler: DebuggerHandler;
  let widget: TestDocumentWidget;

  beforeEach(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'python3' });
    // No specs manager: `isAvailable` resolves to true without inspecting
    // kernel metadata, so `updateWidget` runs its full non-debugging path.
    service = new DebuggerService({ config: new Debugger.Config() });
    handler = new DebuggerHandler({
      type: 'file',
      shell: { currentWidget: null } as any,
      service
    });
    widget = new TestDocumentWidget();
  });

  afterEach(async () => {
    if (service.isStarted) {
      await service.stop();
    }
    if (!widget.isDisposed) {
      widget.dispose();
    }
    service.dispose();
    await connection.shutdown();
    connection.dispose();
  });

  describe('#update()', () => {
    it('reports every execution so that the modules can be refreshed', async () => {
      await handler.update(widget as any, connection);

      let executionDone = false;
      handler.executionDone.connect(() => {
        executionDone = true;
      });

      await connection.kernel!.requestExecute({ code: '1 + 1' }).done;
      // `anyMessage` is emitted synchronously as the reply arrives, before
      // `done` resolves; one macrotask keeps the check clear of any
      // reordering in message handling.
      await sleep();

      expect(executionDone).toBe(true);
    });

    it('refreshes the variables on execution once debugging is started', async () => {
      await handler.update(widget as any, connection);

      // Start debugging on the session the handler prepared, as clicking the
      // bug button does.
      await service.restoreState(true);
      expect(service.isStarted).toBe(true);

      const { model } = service;
      model.variables.scopes = [];
      const variablesChanged = signalToPromise(model.variables.changed);
      await connection.kernel!.requestExecute({ code: 'a_variable = 1' }).done;
      await variablesChanged;

      const [globals] = model.variables.scopes;
      expect(globals.variables.map(variable => variable.name)).toContain(
        'a_variable'
      );
    });

    it('leaves the kernel alone once the widget is closed', async () => {
      await handler.update(widget as any, connection);
      await service.restoreState(true);
      const { model } = service;

      widget.dispose();

      // The session outlives the widget (other views of the document may
      // still be open), so the handler has to stop following it.
      let executionDone = false;
      handler.executionDone.connect(() => {
        executionDone = true;
      });
      model.variables.scopes = [];
      await connection.kernel!.requestExecute({ code: 'another_variable = 1' })
        .done;
      // Give the slots that must not run a chance to.
      await sleep();

      expect(executionDone).toBe(false);
      expect(model.variables.scopes).toEqual([]);
      expect(handler.activeWidget).toBeNull();
    });

    it('forgets the closed widget instead of keeping its entries', async () => {
      await handler.update(widget as any, connection);
      widget.dispose();

      // The id-keyed maps live on the application-lifetime handler and have
      // no public accessor: nothing reads them once the widget is gone,
      // which is what makes leftovers a leak rather than a behaviour.
      expect(handler['_kernelChangedHandlers'][widget.id]).toBeUndefined();
      expect(handler['_statusChangedHandlers'][widget.id]).toBeUndefined();
      expect(handler['_iopubMessageHandlers'][widget.id]).toBeUndefined();
      expect(handler['_shellMessageHandlers'][widget.id]).toBeUndefined();
      expect(handler['_iconButtons'][widget.id]).toBeUndefined();
      expect(handler['_debuggerAvailability'][widget.id]).toBeUndefined();
    });

    it('does not recreate per-widget entries when the widget is disposed mid-update', async () => {
      // Dispose the widget while `updateWidget` is suspended on its first
      // await (`isAvailable`): the disposal hook deletes the per-widget
      // entries, and the resumed continuation must not write new ones.
      const pending = handler.update(widget as any, connection);
      widget.dispose();
      await pending;

      expect(handler.activeWidget).toBeNull();
      expect(handler['_debuggerAvailability'][widget.id]).toBeUndefined();
      expect(handler['_iconButtons'][widget.id]).toBeUndefined();
      expect(handler['_kernelChangedHandlers'][widget.id]).toBeUndefined();
    });
  });

  describe('debugger button', () => {
    let context: Context<DocumentRegistry.ICodeModel>;
    let fileWidget: FileEditorWidget;

    beforeEach(() => {
      context = new Context({
        manager: new ServiceManagerMock(),
        factory: new TextModelFactory(),
        path: UUID.uuid4() + '.py'
      });
      const editorFactory = new CodeMirrorEditorFactory();
      const content = new FileEditor({
        factory: options => editorFactory.newDocumentEditor(options),
        mimeTypeService: new CodeMirrorMimeTypeService(
          new EditorLanguageRegistry()
        ),
        context
      });
      fileWidget = new FileEditorWidget({ content, context });
      // Clicks are ignored unless the widget is the current one.
      handler = new DebuggerHandler({
        type: 'file',
        shell: { currentWidget: fileWidget } as any,
        service
      });
    });

    afterEach(async () => {
      // Stop here so that the disposal hook does not send `disconnect` after
      // the kernel is shut down.
      if (service.isStarted) {
        await service.stop();
      }
      fileWidget.dispose();
      context.dispose();
    });

    it('ignores a second click while the debugger starts', async () => {
      await handler.update(fileWidget, connection);
      const button = handler['_iconButtons'][fileWidget.id]!;

      button.onClick();
      // `isStarted` turns true when `initialize` is answered, while the first
      // click still waits for `attach`.
      while (!service.isStarted) {
        await sleep(10);
      }
      button.onClick();
      const pressedAfterSecondClick = button.pressed;
      // The first click creates the debug handler last.
      while (!fileWidget.node.hasAttribute('data-jp-debugger')) {
        await sleep(10);
      }

      const reply = await service.session!.sendRequest('debugInfo', {});
      expect(reply.body.isStarted).toBe(true);
      expect(service.isStarted).toBe(true);
      expect(button.pressed).toBe(true);
      expect(pressedAfterSecondClick).toBe(true);
    });
  });
});
