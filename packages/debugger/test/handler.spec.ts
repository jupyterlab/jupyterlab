// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar } from '@jupyterlab/apputils';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import type { Session } from '@jupyterlab/services';

import { JupyterServer } from '@jupyterlab/testing';

import { UUID } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { Debugger } from '../src/debugger';

import { DebuggerHandler } from '../src/handler';

import { DebuggerService } from '../src/service';

/**
 * A minimal stand-in for a document widget: a real Lumino widget (so that
 * `disposed` and `Signal.clearData` behave as in the application) carrying
 * the toolbar the handler inserts its bug button into.
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
    if (!widget.isDisposed) {
      widget.dispose();
    }
    service.dispose();
    await connection.shutdown();
    connection.dispose();
  });

  describe('#update()', () => {
    it('keeps the kernel message handlers connected when debugging is not started', async () => {
      await handler.update(widget as any, connection);

      // The shell message handler registered by `update()` emits
      // `executionDone` on every execute reply, whether or not a debug
      // session is running.
      let executionDone = false;
      handler.executionDone.connect(() => {
        executionDone = true;
      });

      await connection.kernel!.requestExecute({ code: '1 + 1' }).done;
      // The signal is emitted synchronously while the reply is processed;
      // one macrotask keeps the check clear of message-handling order.
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(executionDone).toBe(true);
    });

    it('registers the per-widget handlers in the bookkeeping maps', async () => {
      await handler.update(widget as any, connection);

      expect((handler as any)._kernelChangedHandlers[widget.id]).toBeDefined();
      expect((handler as any)._statusChangedHandlers[widget.id]).toBeDefined();
      expect((handler as any)._iopubMessageHandlers[widget.id]).toBeDefined();
      expect((handler as any)._shellMessageHandlers[widget.id]).toBeDefined();
    });

    it('releases the per-widget handlers when the widget is disposed', async () => {
      await handler.update(widget as any, connection);
      widget.dispose();

      // The id-keyed maps live on the application-lifetime handler, so the
      // entries (whose slots close over the widget) must not survive it.
      expect(
        (handler as any)._kernelChangedHandlers[widget.id]
      ).toBeUndefined();
      expect(
        (handler as any)._statusChangedHandlers[widget.id]
      ).toBeUndefined();
      expect((handler as any)._iopubMessageHandlers[widget.id]).toBeUndefined();
      expect((handler as any)._shellMessageHandlers[widget.id]).toBeUndefined();

      // The connections themselves are removed by `Signal.clearData` in
      // `Widget.dispose`, so the disposed widget's slots no longer run.
      let executionDone = false;
      handler.executionDone.connect(() => {
        executionDone = true;
      });
      await connection.kernel!.requestExecute({ code: '1 + 1' }).done;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(executionDone).toBe(false);
    });

    it('does not recreate per-widget entries when the widget is disposed mid-update', async () => {
      // Dispose the widget while `updateWidget` is suspended on its first
      // await (`isAvailable`): the disposal hook deletes the per-widget
      // entries, and the resumed continuation must not write new ones.
      const pending = handler.update(widget as any, connection);
      widget.dispose();
      await pending;

      expect((handler as any)._debuggerAvailability[widget.id]).toBeUndefined();
      expect((handler as any)._iconButtons[widget.id]).toBeUndefined();
      expect(
        (handler as any)._kernelChangedHandlers[widget.id]
      ).toBeUndefined();
    });
  });
});
