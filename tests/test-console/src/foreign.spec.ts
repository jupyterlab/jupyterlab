// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PromiseDelegate, UUID } from '@phosphor/coreutils';

import { KernelMessage, Session } from '@jupyterlab/services';

import { Signal } from '@phosphor/signaling';

import { Panel } from '@phosphor/widgets';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { ForeignHandler } from '@jupyterlab/console';

import { CodeCellModel, CodeCell } from '@jupyterlab/cells';

import {
  createClientSession,
  defaultRenderMime,
  NBTestUtils
} from '@jupyterlab/testutils';

class TestParent extends Panel implements ForeignHandler.IReceiver {
  addCell(cell: CodeCell, msgId?: string): void {
    this.addWidget(cell);
    if (msgId) {
      this._cells.set(msgId, cell);
    }
  }

  createCodeCell(): CodeCell {
    const contentFactory = NBTestUtils.createCodeCellFactory();
    const model = new CodeCellModel({});
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
    sender: IClientSession,
    msg: KernelMessage.IIOPubMessage
  ): boolean {
    const injected = super.onIOPubMessage(sender, msg);
    this.received.emit(msg);
    if (injected) {
      this.injected.emit(msg);
    } else {
      // If the message was not injected but otherwise would have been, emit
      // a rejected signal. This should only happen if `enabled` is `false`.
      const session = (msg.parent_header as KernelMessage.IHeader).session;
      const msgType = msg.header.msg_type;
      if (
        session !== this.session.kernel.clientId &&
        relevantTypes.has(msgType)
      ) {
        this.rejected.emit(msg);
      }
    }
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
    let local: Session.ISession;
    let foreign: Session.ISession;
    let handler: TestHandler;
    let session: IClientSession;

    before(async () => {
      const path = UUID.uuid4();
      const sessions = [Session.startNew({ path }), Session.startNew({ path })];
      [local, foreign] = await Promise.all(sessions);
      session = await createClientSession({ path: local.path });
      await (session as ClientSession).initialize();
      await session.kernel.ready;
    });

    beforeEach(() => {
      const parent = new TestParent();
      handler = new TestHandler({ session, parent });
    });

    afterEach(() => {
      handler.dispose();
    });

    after(async () => {
      local.dispose();
      foreign.dispose();
      await session.shutdown();
      session.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new foreign handler', () => {
        expect(handler).to.be.an.instanceof(ForeignHandler);
      });
    });

    describe('#enabled', () => {
      it('should default to `false`', () => {
        expect(handler.enabled).to.equal(false);
      });

      it('should allow foreign cells to be injected if `true`', async () => {
        const code = 'print("#enabled:true")';
        handler.enabled = true;
        let called = false;
        handler.injected.connect(() => {
          called = true;
        });
        await foreign.kernel.requestExecute({ code, stop_on_error: true }).done;
        expect(called).to.equal(true);
      });

      it('should reject foreign cells if `false`', async () => {
        const code = 'print("#enabled:false")';
        handler.enabled = false;
        let called = false;
        handler.rejected.connect(() => {
          called = true;
        });
        await foreign.kernel.requestExecute({ code, stop_on_error: true }).done;
        expect(called).to.equal(true);
      });
    });

    describe('#isDisposed', () => {
      it('should indicate whether the handler is disposed', () => {
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });
    });

    describe('#session', () => {
      it('should be a client session object', () => {
        expect(handler.session.path).to.be.ok;
      });
    });

    describe('#parent', () => {
      it('should be set upon instantiation', () => {
        const parent = new TestParent();
        handler = new TestHandler({
          session: handler.session,
          parent
        });
        expect(handler.parent).to.equal(parent);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the handler', () => {
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });
    });

    describe('#onIOPubMessage()', () => {
      it('should be called when messages come through', async () => {
        const code = 'print("onIOPubMessage:disabled")';
        const promise = new PromiseDelegate<void>();
        handler.enabled = false;
        let called = false;
        handler.received.connect(() => {
          called = true;
          promise.resolve(void 0);
        });
        await foreign.kernel.requestExecute({ code, stop_on_error: true }).done;
        await promise.promise;
        expect(called).to.equal(true);
      });

      it('should inject relevant cells into the parent', async () => {
        const code = 'print("#onIOPubMessage:enabled")';
        const promise = new PromiseDelegate<void>();
        handler.enabled = true;
        const parent = handler.parent as TestParent;
        expect(parent.widgets.length).to.equal(0);
        let called = false;
        handler.injected.connect(() => {
          expect(parent.widgets.length).to.be.greaterThan(0);
          called = true;
          promise.resolve(void 0);
        });
        await foreign.kernel.requestExecute({ code, stop_on_error: true }).done;
        await promise.promise;
        expect(called).to.equal(true);
      });

      it('should not reject relevant iopub messages', async () => {
        const code = 'print("#onIOPubMessage:relevant")';
        const promise = new PromiseDelegate<void>();
        let called = false;
        handler.enabled = true;
        handler.rejected.connect(() => {
          promise.reject('rejected relevant iopub message');
        });
        handler.injected.connect((sender, msg) => {
          if (KernelMessage.isStreamMsg(msg)) {
            called = true;
            promise.resolve(void 0);
          }
        });
        await foreign.kernel.requestExecute({ code, stop_on_error: true }).done;
        await promise.promise;
        expect(called).to.equal(true);
      });
    });
  });
});
