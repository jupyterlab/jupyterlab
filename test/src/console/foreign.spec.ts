// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel, KernelMessage, utils, Session
} from '@jupyterlab/services';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Panel
} from '@phosphor/widgets';

import {
  ForeignHandler
} from '@jupyterlab/console';

import {
  CodeCellModel, CodeCellWidget
} from '@jupyterlab/cells';

import {
  createCodeCellFactory
} from '../notebook/utils';

import {
  defaultRenderMime
} from '../utils';


class TestParent extends Panel implements ForeignHandler.IReceiver {
  addCell(cell: CodeCellWidget): void {
    this.addWidget(cell);
  }
}


class TestHandler extends ForeignHandler {

  injected = new Signal<this, void>(this);

  received = new Signal<this, void>(this);

  rejected = new Signal<this, void>(this);

  methods: string[] = [];

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    Signal.clearData(this);
  }

  protected onIOPubMessage(sender: Kernel.IKernel, msg: KernelMessage.IIOPubMessage): boolean {
    let injected = super.onIOPubMessage(sender, msg);
    this.received.emit(void 0);
    if (injected) {
      this.injected.emit(void 0);
    } else {
      // If the message was not injected but otherwise would have been, emit
      // a rejected signal. This should only happen if `enabled` is `false`.
      let session = (msg.parent_header as KernelMessage.IHeader).session;
      let msgType = msg.header.msg_type;
      if (session !== this.kernel.clientId && relevantTypes.has(msgType)) {
        this.rejected.emit(void 0);
      }
    }
    return injected;
  }
}


const rendermime = defaultRenderMime();

function cellFactory(): CodeCellWidget {
  let contentFactory = createCodeCellFactory();
  let model = new CodeCellModel({});
  let cell = new CodeCellWidget({ model, rendermime, contentFactory });
  return cell;
};
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


describe('console/foreign', () => {

  describe('ForeignHandler', () => {

    describe('#constructor()', () => {

      it('should create a new foreign handler', () => {
        let handler = new TestHandler({ kernel: null, parent: null,
                                        cellFactory });
        expect(handler).to.be.a(ForeignHandler);
      });

    });

    describe('#enabled', () => {

      let local: Session.ISession;
      let foreign: Session.ISession;
      let handler: TestHandler;

      beforeEach(done => {
        let parent = new TestParent();
        let path = utils.uuid();
        let sessions = [Session.startNew({ path }), Session.startNew({ path })];
        Promise.all(sessions).then(([one, two]) => {
          local = one;
          foreign = two;
          handler = new TestHandler({ kernel: local.kernel, parent, cellFactory });
          done();
        }).catch(done);
      });

      afterEach(done => {
        handler.dispose();
        local.shutdown().then(() => {
          local.dispose();
          foreign.dispose();
          done();
        }).catch(done);
      });

      it('should default to `true`', () => {
        expect(handler.enabled).to.be(true);
      });

      it('should allow foreign cells to be injected if `true`', done => {
        let code = 'print("#enabled:true")';
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
        let handler = new TestHandler({ kernel: null, parent: null, cellFactory });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#kernel', () => {

      it('should be set upon instantiation', () => {
        let handler = new TestHandler({ kernel: null, parent: null, cellFactory });
        expect(handler.kernel).to.be(null);
      });

      it('should be resettable', done => {
        let handler = new TestHandler({ kernel: null, parent: null, cellFactory });
        Session.startNew({ path: utils.uuid() }).then(session => {
          expect(handler.kernel).to.be(null);
          handler.kernel = session.kernel;
          expect(handler.kernel).to.be(session.kernel);
          session.dispose();
          handler.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#parent', () => {

      it('should be set upon instantiation', () => {
        let parent = new TestParent();
        let handler = new TestHandler({ kernel: null, parent, cellFactory });
        expect(handler.parent).to.be(parent);
      });

    });

    describe('#dispose()', () => {

      it('should dispose the resources held by the handler', () => {
        let handler = new TestHandler({ kernel: null, parent: null, cellFactory });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let handler = new TestHandler({ kernel: null, parent: null, cellFactory });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#onIOPubMessage()', () => {

      let local: Session.ISession;
      let foreign: Session.ISession;
      let handler: TestHandler;

      beforeEach(done => {
        let parent = new TestParent();
        let path = utils.uuid();
        let sessions = [Session.startNew({ path }), Session.startNew({ path })];
        Promise.all(sessions).then(([one, two]) => {
          local = one;
          foreign = two;
          handler = new TestHandler({ kernel: local.kernel, parent, cellFactory });
          done();
        }).catch(done);
      });

      afterEach(done => {
        handler.dispose();
        local.shutdown().then(() => {
          local.dispose();
          foreign.dispose();
          done();
        }).catch(done);
      });

      it('should be called when messages come through', done => {
        let code = 'print("onIOPubMessage:disabled")';
        handler.enabled = false;
        handler.received.connect(() => { done(); });
        foreign.kernel.requestExecute({ code, stop_on_error: true });
      });

      it('should inject relevant cells into the parent', done => {
        let code = 'print("#onIOPubMessage:enabled")';
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
