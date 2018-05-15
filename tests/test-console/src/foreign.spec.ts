// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  KernelMessage, Session
} from '@jupyterlab/services';

import {
  Signal
} from '@phosphor/signaling';

import {
  Panel
} from '@phosphor/widgets';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  ForeignHandler
} from '@jupyterlab/console';

import {
  CodeCellModel, CodeCell
} from '@jupyterlab/cells';

import {
  createCodeCellFactory
} from '../../notebook-utils';

import {
  createClientSession, defaultRenderMime
} from '../../utils';


class TestParent extends Panel implements ForeignHandler.IReceiver {
  addCell(cell: CodeCell): void {
    this.addWidget(cell);
  }
}


class TestHandler extends ForeignHandler {

  injected = new Signal<this, void>(this);

  received = new Signal<this, void>(this);

  rejected = new Signal<this, void>(this);

  methods: string[] = [];

  protected onIOPubMessage(sender: IClientSession, msg: KernelMessage.IIOPubMessage): boolean {
    let injected = super.onIOPubMessage(sender, msg);
    this.received.emit(void 0);
    if (injected) {
      this.injected.emit(void 0);
    } else {
      // If the message was not injected but otherwise would have been, emit
      // a rejected signal. This should only happen if `enabled` is `false`.
      let session = (msg.parent_header as KernelMessage.IHeader).session;
      let msgType = msg.header.msg_type;
      if (session !== this.session.kernel.clientId && relevantTypes.has(msgType)) {
        this.rejected.emit(void 0);
      }
    }
    return injected;
  }
}


const rendermime = defaultRenderMime();

function cellFactory(): CodeCell {
  let contentFactory = createCodeCellFactory();
  let model = new CodeCellModel({});
  let cell = new CodeCell({ model, rendermime, contentFactory });
  return cell;
}
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

    before(() => {
      let path = uuid();
      let sessions = [Session.startNew({ path }), Session.startNew({ path })];
      return Promise.all(sessions).then(([one, two]) => {
        local = one;
        foreign = two;
      }).then(() => {
        return createClientSession({ path: local.path });
      }).then(s => {
        session = s;
        return s.initialize();
      });
    });

    beforeEach(() => {
      let parent = new TestParent();
      handler = new TestHandler({ session, parent, cellFactory });
    });

    afterEach(() => {
      handler.dispose();
    });

    after(() => {
      local.dispose();
      foreign.dispose();
      return session.shutdown().then(() => {
        session.dispose();
      });
    });

    describe('#constructor()', () => {

      it('should create a new foreign handler', () => {
        expect(handler).to.be.a(ForeignHandler);
      });

    });

    describe('#enabled', () => {

      it('should default to `false`', () => {
        expect(handler.enabled).to.be(false);
      });

      it('should allow foreign cells to be injected if `true`', done => {
        let code = 'print("#enabled:true")';
        handler.enabled = true;
        handler.injected.connect(() => { done(); });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

      it('should reject foreign cells if `false`', done => {
        let code = 'print("#enabled:false")';
        handler.enabled = false;
        handler.rejected.connect(() => { done(); });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the handler is disposed', () => {
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#session', () => {

      it('should be a client session object', () => {
        expect(handler.session.path).to.ok();
      });

    });

    describe('#parent', () => {

      it('should be set upon instantiation', () => {
        let parent = new TestParent();
        handler = new TestHandler({
          session: handler.session, parent, cellFactory
        });
        expect(handler.parent).to.be(parent);
      });

    });

    describe('#dispose()', () => {

      it('should dispose the resources held by the handler', () => {
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#onIOPubMessage()', () => {

      it('should be called when messages come through', done => {
        let code = 'print("onIOPubMessage:disabled")';
        handler.enabled = false;
        handler.received.connect(() => { done(); });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

      it('should inject relevant cells into the parent', done => {
        let code = 'print("#onIOPubMessage:enabled")';
        handler.enabled = true;
        let parent = handler.parent as TestParent;
        expect(parent.widgets.length).to.be(0);
        handler.injected.connect(() => {
          expect(parent.widgets.length).to.be.greaterThan(0);
          done();
        });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

      it('should not reject relevant iopub messages', done => {
        let code = 'print("#onIOPubMessage:relevant")';
        let called = 0;
        handler.enabled = true;
        handler.rejected.connect(() => {
          done(new Error('rejected relevant iopub message'));
        });
        handler.injected.connect(() => {
          if (++called === 2) {
            done();
          }
        });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

    });

  });

});
