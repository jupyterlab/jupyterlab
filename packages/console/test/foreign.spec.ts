// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext } from '@jupyterlab/apputils';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';
import { NBTestUtils } from '@jupyterlab/cells/lib/testutils';
import { ForeignHandler } from '@jupyterlab/console';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';
import * as Mock from '@jupyterlab/docregistry/lib/testutils';
import {
  cloneKernel,
  KernelMock,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';
import { KernelMessage } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { Panel } from '@lumino/widgets';

class TestParent extends Panel implements ForeignHandler.IReceiver {
  addCell(cell: CodeCell, msgId?: string): void {
    this.addWidget(cell);
    if (msgId) {
      this._cells.set(msgId, cell);
    }
  }

  createCodeCell(): CodeCell {
    const contentFactory = NBTestUtils.createCodeCellFactory();
    const model = new CodeCellModel();
    const cell = new CodeCell({
      model,
      rendermime,
      contentFactory
    }).initializeState();
    return cell;
  }

  getCell(msgId: string) {
    return this._cells.get(msgId);
  }

  private _cells = new Map<string, CodeCell>();
}

class TestHandler extends ForeignHandler {
  injected = new Signal<this, KernelMessage.IIOPubMessage>(this);

  received = new Signal<this, KernelMessage.IIOPubMessage>(this);

  rejected = new Signal<this, KernelMessage.IIOPubMessage>(this);

  methods: string[] = [];

  protected onIOPubMessage(
    sender: ISessionContext,
    msg: KernelMessage.IIOPubMessage
  ): boolean {
    const injected = super.onIOPubMessage(sender, msg);
    if (injected) {
      this.injected.emit(msg);
    } else {
      // If the message was not injected but otherwise would have been, emit
      // a rejected signal. This should only happen if `enabled` is `false`.
      const session = (msg.parent_header as KernelMessage.IHeader).session;
      const msgType = msg.header.msg_type;
      if (
        session !== this.sessionContext.session!.kernel!.clientId &&
        relevantTypes.has(msgType)
      ) {
        this.rejected.emit(msg);
      } else {
        console.debug(session, this.sessionContext.session?.kernel?.clientId);
      }
    }
    this.received.emit(msg);
    return injected;
  }
}

const rendermime = defaultRenderMime();

const relevantTypes = [
  'execute_input',
  'execute_result',
  'display_data',
  'stream',
  'error',
  'clear_output'
].reduce((acc, val) => {
  acc.add(val);
  return acc;
}, new Set<string>());

describe('@jupyterlab/console', () => {
  describe('ForeignHandler', () => {
    let foreign: ISessionContext;
    let handler: TestHandler;
    let sessionContext: ISessionContext;

    const streamMsg = KernelMessage.createMessage({
      session: 'foo',
      channel: 'iopub',
      msgType: 'stream',
      content: { name: 'stderr', text: 'foo' }
    });

    const clearMsg = KernelMessage.createMessage({
      session: 'foo',
      channel: 'iopub',
      msgType: 'clear_output',
      content: { wait: false }
    });

    beforeAll(async function () {
      const path = UUID.uuid4();
      const kernel0 = new KernelMock({});
      const kernel1 = cloneKernel(kernel0);
      const connection0 = new SessionConnectionMock(
        { model: { path, type: 'test' } },
        kernel0
      );
      sessionContext = new Mock.SessionContextMock({}, connection0);
      const connection1 = new SessionConnectionMock(
        { model: { path, type: 'test2' } },
        kernel1
      );
      foreign = new Mock.SessionContextMock({}, connection1);

      await sessionContext.initialize();
      await sessionContext.session!.kernel!.info;
    });

    beforeEach(() => {
      const parent = new TestParent();
      handler = new TestHandler({ sessionContext, parent });
    });

    afterEach(() => {
      handler.dispose();
    });

    afterAll(async () => {
      foreign.dispose();
      await sessionContext.shutdown();
      sessionContext.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new foreign handler', () => {
        expect(handler).toBeInstanceOf(ForeignHandler);
      });
    });

    describe('#enabled', () => {
      it('should default to `false`', () => {
        expect(handler.enabled).toBe(false);
      });

      it('should allow foreign cells to be injected if `true`', async () => {
        handler.enabled = true;
        let called = false;
        handler.injected.connect(() => {
          called = true;
        });
        await foreign.session!.kernel!.requestExecute({ code: 'foo' }).done;
        Mock.emitIopubMessage(foreign, streamMsg);
        expect(called).toBe(true);
      });

      it('should reject foreign cells if `false`', async () => {
        handler.enabled = false;
        let called = false;
        handler.rejected.connect(() => {
          called = true;
        });
        await foreign.session!.kernel!.requestExecute({ code: 'foo' }).done;
        Mock.emitIopubMessage(foreign, streamMsg);
        expect(called).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should indicate whether the handler is disposed', () => {
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#session', () => {
      it('should be a client session object', () => {
        expect(handler.sessionContext.session!.path).toBeTruthy();
      });
    });

    describe('#parent', () => {
      it('should be set upon instantiation', () => {
        const parent = new TestParent();
        handler = new TestHandler({
          sessionContext: handler.sessionContext,
          parent
        });
        expect(handler.parent).toBe(parent);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the handler', () => {
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#onIOPubMessage()', () => {
      it('should be called when messages come through', async () => {
        handler.enabled = false;
        let called = false;
        handler.received.connect(() => {
          called = true;
        });
        await foreign.session!.kernel!.requestExecute({ code: 'foo' }).done;
        Mock.emitIopubMessage(foreign, streamMsg);
        expect(called).toBe(true);
      });

      it('should inject relevant cells into the parent', async () => {
        handler.enabled = true;
        const parent = handler.parent as TestParent;
        expect(parent.widgets.length).toBe(0);
        let called = false;
        handler.injected.connect(() => {
          expect(parent.widgets.length).toBeGreaterThan(0);
          called = true;
        });
        await foreign.session!.kernel!.requestExecute({ code: 'foo' }).done;
        Mock.emitIopubMessage(foreign, streamMsg);
        expect(called).toBe(true);
      });

      it('should not reject relevant iopub messages', async () => {
        let called = false;
        let errored = false;
        handler.enabled = true;
        handler.rejected.connect(() => {
          errored = true;
        });
        handler.received.connect((sender, msg) => {
          if (KernelMessage.isClearOutputMsg(msg)) {
            called = true;
          }
        });
        await foreign.session!.kernel!.requestExecute({ code: 'foo' }).done;
        Mock.emitIopubMessage(foreign, clearMsg);
        expect(called).toBe(true);
        expect(errored).toBe(false);
      });
    });
  });
});
