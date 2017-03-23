// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  uuid, getBaseUrl
} from '../../../lib/utils';

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  ajaxSettings, doLater, expectFailure, expectAjaxError,
  KernelTester,
  KERNEL_OPTIONS, AJAX_KERNEL_OPTIONS, EXAMPLE_KERNEL_INFO,
  PYTHON_SPEC
} from '../utils';



let PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

let createMsg = (channel: KernelMessage.Channel, parentHeader: JSONObject): KernelMessage.IMessage => {
  return {
    channel: channel,
    parent_header: JSON.parse(JSON.stringify(parentHeader)),
    content: {},
    header: JSON.parse(JSON.stringify(parentHeader)),
    metadata: {},
    buffers: []
  };
};


describe('kernel', () => {

  let tester: KernelTester;
  let kernel: Kernel.IKernel;

  beforeEach(() => {
    tester = new KernelTester();
  });

  afterEach(() => {
    if (kernel) {
      kernel.dispose();
    }
    tester.dispose();
  });

  describe('Kernel.listRunning()', () => {

    it('should yield a list of valid kernel ids', (done) => {
      let data = [
        { id: uuid(), name: 'test' },
        { id: uuid(), name: 'test2' }
      ];
      tester.runningKernels = data;
      let options: Kernel.IOptions = {
        baseUrl: 'http://localhost:8888',
      };
      Kernel.listRunning(options).then(response => {
        let running = toArray(response);
        expect(running[0]).to.eql(data[0]);
        expect(running[1]).to.eql(data[1]);
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let data = [
        { id: uuid(), name: 'test' },
        { id: uuid(), name: 'test2' }
      ];
      tester.runningKernels = data;
      let options: Kernel.IOptions = {
        baseUrl: 'http://localhost:8888',
        ajaxSettings: ajaxSettings
      };
      Kernel.listRunning(options).then(response => {
        let running = toArray(response);
        expect(running[0]).to.eql(data[0]);
        expect(running[1]).to.eql(data[1]);
        done();
      });
    });

    it('should throw an error for an invalid model', (done) => {
      tester.onRequest = () => {
        let data = { id: uuid(), name: 'test' };
        tester.respond(200, data);
      };
      let promise = Kernel.listRunning({ baseUrl: 'http://localhost:8888' });
      expectAjaxError(promise, done, 'Invalid kernel list');
    });

    it('should throw an error for an invalid response', (done) => {
      tester.onRequest = () => {
        tester.respond(201, { });
      };
      let list = Kernel.listRunning({ baseUrl: 'http://localhost:8888' });
      expectAjaxError(list, done, 'Invalid Status: 201');
    });

    it('should throw an error for an error response', (done) => {
      tester.onRequest = () => {
        tester.respond(500, { });
      };
      let list = Kernel.listRunning({ baseUrl: 'http://localhost:8888' });
      expectFailure(list, done, '');
    });

  });

  describe('Kernel.startNew()', () => {

    it('should create an Kernel.IKernel object', (done) => {
      Kernel.startNew(KERNEL_OPTIONS).then(k => {
        kernel = k;
        expect(kernel.status).to.be('unknown');
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let kernelPromise = Kernel.startNew(AJAX_KERNEL_OPTIONS);
      kernelPromise.then(k => {
        kernel = k;
        expect(kernel.status).to.be('unknown');
        done();
      });
    });

    it('should still start if the kernel dies', (done) => {
      tester.initialStatus = 'dead';
      Kernel.startNew(KERNEL_OPTIONS).then(k => {
        kernel = k;
        kernel.statusChanged.connect((sender, state) => {
          if (state === 'dead') {
            done();
          }
        });
      });
    });

    it('should throw an error for an invalid kernel id', (done) => {
      tester.onRequest = () => {
        let data = { id: uuid() };
        tester.respond(201, data);
      };
      let kernelPromise = Kernel.startNew(KERNEL_OPTIONS);
      expectFailure(kernelPromise, done);
    });

    it('should throw an error for another invalid kernel id', (done) => {
      tester.onRequest = () => {
        let data = { id: uuid(), name: 1 };
        tester.respond(201, data);
      };
      let kernelPromise = Kernel.startNew(KERNEL_OPTIONS);
      expectFailure(kernelPromise, done);
    });

    it('should throw an error for an invalid response', (done) => {
      tester.onRequest = () => {
        let data = { id: uuid(), name: KERNEL_OPTIONS.name };
        tester.respond(200, data);
      };
      let kernelPromise = Kernel.startNew(KERNEL_OPTIONS);
      expectAjaxError(kernelPromise, done, 'Invalid Status: 200');
    });

    it('should throw an error for an error response', (done) => {
      tester.onRequest = () => {
        tester.respond(500, { });
      };
      let kernelPromise = Kernel.startNew(KERNEL_OPTIONS);
      expectFailure(kernelPromise, done, '');
    });

    it('should auto-reconnect on websocket error', (done) => {
      Kernel.startNew(KERNEL_OPTIONS).then(k => {
        kernel = k;
        expect(kernel.status).to.be('unknown');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'reconnecting') {
            done();
            return;
          }
          if (kernel.status === 'starting') {
            tester.close();
          }
        });
      });

    });

  });

  describe('Kernel.connectTo()', () => {

    it('should reuse an exisiting kernel', (done) => {
      let id = uuid();
      tester.runningKernels = [{ name: 'foo', id }];
      Kernel.connectTo(id, KERNEL_OPTIONS).then(k => {
        kernel = k;
        Kernel.connectTo(id).then(newKernel => {
          expect(newKernel.name).to.be(kernel.name);
          expect(newKernel.id).to.be(kernel.id);
          newKernel.dispose();
          done();
        });
      });
    });

    it('should connect to a running kernel if given kernel options', (done) => {
      let id = uuid();
      tester.runningKernels = [{ name: KERNEL_OPTIONS.name, id }];
      Kernel.connectTo(id, KERNEL_OPTIONS).then(k => {
        kernel = k;
        expect(kernel.name).to.be(KERNEL_OPTIONS.name);
        expect(kernel.id).to.be(id);
        done();
      }).catch(done);
    });

    it('should accept ajax options', (done) => {
      let id = uuid();
      tester.runningKernels = [{ name: KERNEL_OPTIONS.name, id }];
      Kernel.connectTo(id, AJAX_KERNEL_OPTIONS).then(k => {
        kernel = k;
        expect(kernel.name).to.be(KERNEL_OPTIONS.name);
        expect(kernel.id).to.be(id);
        done();
      }).catch(done);
    });

    it('should fail if no running kernel available', (done) => {
      let id = uuid();
      tester.onRequest = () => {
        tester.respond(400, { });
      };
      let kernelPromise = Kernel.connectTo(id, KERNEL_OPTIONS);
      expectFailure(kernelPromise, done, 'No running kernel with id: ' + id);
    });

  });

  describe('Kernel.shutdown()', () => {

    it('should shut down a kernel by id', (done) => {
      Kernel.shutdown('foo').then(done, done);
    });

    it('should handle a 404 error', (done) => {
      tester.onRequest = () => {
        tester.respond(404, { });
      };
      Kernel.shutdown('foo').then(done, done);
    });

  });

  describe('Kernel.IKernel', () => {

    beforeEach((done) => {
      Kernel.startNew().then(k => {
        kernel = k;
        return kernel.ready;
      }).then(() => {
        done();
      }).catch(done);
    });

    context('#terminated', () => {

      it('should be emitted when the kernel is shut down', (done) => {
        kernel.terminated.connect((sender, args) => {
          expect(sender).to.be(kernel);
          expect(args).to.be(void 0);
          done();
        });
        kernel.shutdown();
      });

    });

    context('#statusChanged', () => {

      it('should be a signal following the Kernel status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'busy') {
            done();
          }
        });
        tester.sendStatus('busy');
      });

    });

    context('#iopubMessage', () => {

      it('should be emitted for an iopub message', (done) => {
        kernel.iopubMessage.connect((k, msg) => {
          expect(msg.header.msg_type).to.be('status');
          done();
        });
        let msg = KernelMessage.createMessage({
          msgType: 'status',
          channel: 'iopub',
          session: kernel.clientId
        }) as KernelMessage.IStatusMsg;
        msg.content.execution_state = 'idle';
        msg.parent_header = msg.header;
        tester.send(msg);
      });

      it('should be emitted regardless of the sender', (done) => {
        kernel.iopubMessage.connect((k, msg) => {
          expect(msg.header.msg_type).to.be('status');
          done();
        });
        let msg = KernelMessage.createMessage({
          msgType: 'status',
          channel: 'iopub',
          session: 'baz'
        }) as KernelMessage.IStatusMsg;
        msg.content.execution_state = 'idle';
        msg.parent_header = msg.header;
        tester.send(msg);
      });

    });

    context('#unhandledMessage', () => {

      it('should be emitted for an unhandled message', (done) => {
        kernel.unhandledMessage.connect((k, msg) => {
          expect(msg.header.msg_type).to.be('foo');
          done();
        });
        let msg = KernelMessage.createShellMessage({
          msgType: 'foo',
          channel: 'shell',
          session: kernel.clientId
        });
        msg.parent_header = msg.header;
        tester.send(msg);
      });

      it('should not be emitted for an iopub signal', () => {
        let called = false;
        kernel.unhandledMessage.connect((k, msg) => {
          called = true;
        });
        let msg = KernelMessage.createMessage({
          msgType: 'status',
          channel: 'iopub',
          session: kernel.clientId
        }) as KernelMessage.IStatusMsg;
        msg.content.execution_state = 'idle';
        msg.parent_header = msg.header;
        tester.send(msg);
        expect(called).to.be(false);
      });

      it('should not be emitted for a different client session', () => {
        let called = false;
        kernel.unhandledMessage.connect((k, msg) => {
          called = true;
        });
        let msg = KernelMessage.createShellMessage({
          msgType: 'foo',
          channel: 'shell',
          session: 'baz'
        });
        msg.parent_header = msg.header;
        tester.send(msg);
        expect(called).to.be(false);
      });

    });

    context('#id', () => {

      it('should be a string', () => {
        expect(typeof kernel.id).to.be('string');
      });

    });

    context('#name', () => {

      it('should be a string', () => {
        expect(typeof kernel.name).to.be('string');
      });

    });

    context('#model', () => {

      it('should be an IModel', () => {
        let model = kernel.model;
        expect(typeof model.name).to.be('string');
        expect(typeof model.id).to.be('string');
      });

    });

    context('#username', () => {

      it('should be a string', () => {
        expect(typeof kernel.username).to.be('string');
      });

    });

    context('#baseUrl', () => {

      it('should be the base url of the server', () => {
        expect(kernel.baseUrl).to.be(getBaseUrl());
      });

    });

    context('#clientId', () => {

      it('should be a string', () => {
        expect(typeof kernel.clientId).to.be('string');
      });
    });

    context('#status', () => {

      it('should get an idle status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'idle') {
            done();
          }
        });
        tester.sendStatus('idle');
      });

      it('should get a restarting status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'restarting') {
            done();
          }
        });
        tester.sendStatus('restarting');
      });

      it('should get a busy status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'busy') {
            done();
          }
        });
        tester.sendStatus('busy');
      });

      it('should get a reconnecting status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'reconnecting') {
            done();
          }
        });
        tester.close();
      });

      it('should get a dead status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            done();
          }
        });
        tester.sendStatus('dead');
      });

      it('should handle an invalid status', (done) => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'idle') {
            done();
          }
        });
        tester.sendStatus('celebrating');
        tester.sendStatus('idle');
      });
    });

    context('#info', () => {

      it('should get the kernel info', (done) => {
        return kernel.ready.then(() => {
          let name = kernel.info.language_info.name;
          expect(name).to.be(EXAMPLE_KERNEL_INFO.language_info.name);
        }).then(done, done);
      });

    });

    context('#getSpec()', () => {

      it('should resolve with the spec', (done) => {
        return kernel.getSpec().then(spec => {
          expect(spec.language).to.be('python');
        }).then(done, done);
      });

    });

    context('#isReady', () => {

      it('should test whether the kernel is ready', (done) => {
        kernel.shutdown();
        Kernel.startNew().then(k => {
          kernel = k;
          expect(kernel.isReady).to.be(false);
          return kernel.ready;
        }).then(() => {
          expect(kernel.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

    context('#ready', () => {

      it('should resolve when the kernel is ready', (done) => {
        return kernel.ready.then(done, done);
      });

    });

    context('#isDisposed', () => {

      it('should be true after we dispose of the kernel', () => {
        expect(kernel.isDisposed).to.be(false);
        kernel.dispose();
        expect(kernel.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        expect(kernel.isDisposed).to.be(false);
        expect(kernel.isDisposed).to.be(false);
        kernel.dispose();
        expect(kernel.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
      });
    });

    context('#dispose()', () => {

      it('should dispose of the resources held by the kernel', () => {
        let future = kernel.requestExecute({ code: 'foo' });
        let comm = kernel.connectToComm('foo');
        expect(future.isDisposed).to.be(false);
        expect(comm.isDisposed).to.be(false);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
        expect(comm.isDisposed).to.be(true);
      });

      it('should be safe to call twice', () => {
        let future = kernel.requestExecute({ code: 'foo' });
        let comm = kernel.connectToComm('foo');
        expect(future.isDisposed).to.be(false);
        expect(comm.isDisposed).to.be(false);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
        expect(comm.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
        expect(comm.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
      });
    });

    context('#sendShellMessage()', () => {

      it('should send a message to the kernel', (done) => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let msg = KernelMessage.createShellMessage(options);
        kernel.sendShellMessage(msg, true);
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('custom');
          done();
        });
      });

      it('should send a binary message', (done) => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let encoder = new TextEncoder('utf8');
        let data = encoder.encode('hello');
        let msg = KernelMessage.createShellMessage(options, {}, {}, [data, data.buffer]);
        kernel.sendShellMessage(msg, true);

        tester.onMessage((msg: any) => {
          let decoder = new TextDecoder('utf8');
          let item = msg.buffers[0] as DataView;
          expect(decoder.decode(item)).to.be('hello');
          done();
        });
      });

      it('should fail if the kernel is dead', (done) => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let msg = KernelMessage.createShellMessage(options);
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          try {
            kernel.sendShellMessage(msg, true);
          } catch (err) {
            expect(err.message).to.be('Kernel is dead');
            done();
          }
        });
      });

      it('should handle out of order messages', (done) => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let msg = KernelMessage.createShellMessage(options);
        let future = kernel.sendShellMessage(msg, true);
        let newMsg: KernelMessage.IMessage;

        tester.onMessage((msg) => {
          // trigger onDone
          options.msgType = 'status';
          options.channel = 'iopub';
          newMsg = KernelMessage.createMessage(options, { execution_state: 'idle' });
          newMsg.parent_header = msg.header;
          tester.send(newMsg);

          future.onIOPub = () => {
            options.msgType = 'custom';
            options.channel = 'shell';
            newMsg = KernelMessage.createShellMessage(options);
            newMsg.parent_header = msg.header;
            tester.send(newMsg);
          };

          future.onDone = () => {
            done();
          };
        });
      });
    });

    context('#interrupt()', () => {

      it('should interrupt and resolve with a valid server response', (done) => {
        kernel.interrupt().then(() => { done(); });
      });

      it('should throw an error for an invalid response', (done) => {
        tester.onRequest = () => {
          tester.respond(200,  { id: kernel.id, name: kernel.name });
        };
        let interrupt = kernel.interrupt();
        expectAjaxError(interrupt, done, 'Invalid Status: 200');
      });

      it('should throw an error for an error response', (done) => {
        tester.onRequest = () => {
          tester.respond(500, { });
        };
        let interrupt = kernel.interrupt();
        expectFailure(interrupt, done, '');
      });

      it('should fail if the kernel is dead', (done) => {
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            expectFailure(kernel.interrupt(), done, 'Kernel is dead');
          }
        });
      });
    });

    context('#restart()', () => {

      it('should restart and resolve with a valid server response', (done) => {
        kernel.restart().then(() => { done(); });
      });

      it('should fail if the kernel does not restart', (done) => {
        tester.onRequest = () => {
          tester.respond(500, {});
        };
        let restart = kernel.restart();
        expectFailure(restart, done, '');
      });

      it('should throw an error for an invalid response', (done) => {
        tester.onRequest = () => {
          tester.respond(205, { id: kernel.id, name: kernel.name });
        };
        let restart = kernel.restart();
        expectAjaxError(restart, done, 'Invalid Status: 205');
      });

      it('should throw an error for an error response', (done) => {
        tester.onRequest = () => {
          tester.respond(500, { });
        };
        let restart = kernel.restart();
        expectFailure(restart, done, '');
      });

      it('should throw an error for an invalid id', (done) => {
        tester.onRequest = () => {
          tester.respond(200, { });
        };
        let restart = kernel.restart();
        expectFailure(restart, done);
      });

      it('should dispose of existing comm and future objects', (done) => {
        let comm = kernel.connectToComm('test');
        let future = kernel.requestExecute({ code: 'foo' });
        tester.runningKernels = [{ id: kernel.id, name: kernel.name }];
        kernel.restart().then(() => {
          expect(comm.isDisposed).to.be(true);
          expect(future.isDisposed).to.be(true);
          done();
        });
      });

    });

    describe('#reconnect()', () => {

      it('should reconnect the websocket', (done) => {
        kernel.ready.then(() => {
          return kernel.reconnect();
        }).then(() => {
          done();
        }).catch(done);
      });

      it("should emit a `'reconnecting'` status", (done) => {
        let called = false;
        kernel.ready.then(() => {
          return kernel.reconnect();
        }).then(() => {
          expect(called).to.be(true);
          done();
        }).catch(done);
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'reconnecting') {
            called = true;
          }
        });
      });

    });

    context('#shutdown()', () => {

      it('should shut down and resolve with a valid server response', (done) => {
        kernel.shutdown().then(() => { done(); });
      });

      it('should throw an error for an invalid response', (done) => {
        tester.onRequest = () => {
          tester.respond(200, { id: uuid(), name: KERNEL_OPTIONS.name });
        };
        let shutdown = kernel.shutdown();
        expectAjaxError(shutdown, done, 'Invalid Status: 200');
      });

      it('should handle a 404 error', (done) => {
        tester.onRequest = () => {
          tester.respond(404, { });
        };
        kernel.shutdown().then(done, done);
      });

      it('should throw an error for an error response', (done) => {
        tester.onRequest = () => {
          tester.respond(500, { });
        };
        let shutdown = kernel.shutdown();
        expectFailure(shutdown, done, '');
      });

      it('should fail if the kernel is dead', (done) => {
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            expectFailure(kernel.shutdown(), done, 'Kernel is dead');
          }
        });
      });

      it('should dispose of all kernel instances', (done) => {
        let kernel2: Kernel.IKernel;
        Kernel.connectTo(kernel.id).then(k => {
          kernel2 = k;
          return kernel.shutdown();
        }).then(() => {
          expect(kernel2.isDisposed).to.be(true);
          done();
        }).catch(done);
      });

    });

    context('#requestKernelInfo()', () => {

      it('should resolve the promise', (done) => {
        // resolved by KernelTester
        kernel.requestKernelInfo().then((msg) => {
          let name = msg.content.language_info.name;
          expect(name).to.be(EXAMPLE_KERNEL_INFO.language_info.name);
          done();
        });
      });
    });

    context('#requestComplete()', () => {

      it('should resolve the promise', (done) => {
        let options: KernelMessage.ICompleteRequest = {
          code: 'hello',
          cursor_pos: 4
        };
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('complete_request');
          msg.parent_header = msg.header;
          tester.send(msg);
        });
        kernel.requestComplete(options).then(() => { done(); });
      });

      it('should reject the promise if the kernel is dead', (done) => {
        let options: KernelMessage.ICompleteRequest = {
          code: 'hello',
          cursor_pos: 4
        };
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            let promise = kernel.requestComplete(options);
            expectFailure(promise, done, 'Kernel is dead');
          }
        });
      });
    });

    context('#requestInspect()', () => {

      it('should resolve the promise', (done) => {
        let options: KernelMessage.IInspectRequest = {
          code: 'hello',
          cursor_pos: 4,
          detail_level: 0
        };
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('inspect_request');
          msg.parent_header = msg.header;
          tester.send(msg);
        });
        kernel.requestInspect(options).then(() => { done(); });
      });

    });

    context('#requestIsComplete()', () => {

      it('should resolve the promise', (done) => {
        let options: KernelMessage.IIsCompleteRequest = {
          code: 'hello'
        };
        let promise = kernel.requestIsComplete(options);
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('is_complete_request');
          msg.parent_header = msg.header;
          tester.send(msg);
        });
        promise.then(() => { done(); });
      });

    });

    context('#requestHistory()', () => {

      it('should resolve the promise', (done) => {
        let options: KernelMessage.IHistoryRequest = {
          output: true,
          raw: true,
          hist_access_type: 'search',
          session: 0,
          start: 1,
          stop: 2,
          n: 1,
          pattern: '*',
          unique: true,
        };
        let promise = kernel.requestHistory(options);
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('history_request');
          msg.parent_header = msg.header;
          tester.send(msg);
        });
        promise.then(() => { done(); });
      });
    });

    context('#sendInputReply()', () => {

      it('should resolve the promise', (done) => {
        kernel.sendInputReply({ value: 'test' });
        tester.onMessage((msg) => {
          expect(msg.header.msg_type).to.be('input_reply');
          done();
        });
      });

      it('should fail if the kernel is dead', (done) => {
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          try {
            kernel.sendInputReply({ value: 'test' });
          } catch (err) {
            expect(err.message).to.be('Kernel is dead');
            done();
          }
        });
      });
    });

    context('#requestExecute()', () => {

      it('should send and handle incoming messages', (done) => {
        let newMsg: KernelMessage.IMessage;
        let content: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(content);
        expect(future.onDone).to.be(null);
        expect(future.onStdin).to.be(null);
        expect(future.onReply).to.be(null);
        expect(future.onIOPub).to.be(null);

        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };

        tester.onMessage((msg) => {
          expect(msg.channel).to.be('shell');

          // send a reply
          options.channel = 'shell';
          newMsg = KernelMessage.createMessage(options);
          newMsg.parent_header = msg.header;
          tester.send(newMsg);

          future.onReply = () => {
            // trigger onStdin
            options.channel = 'stdin';
            newMsg = KernelMessage.createMessage(options);
            newMsg.parent_header = msg.header;
            tester.send(newMsg);
          };

          future.onStdin = () => {
            // trigger onIOPub with a 'stream' message
            options.channel = 'iopub';
            options.msgType = 'stream';
            let streamContent: JSONObject = { name: 'stdout', text: '' };
            newMsg = KernelMessage.createMessage(options, streamContent);
            newMsg.parent_header = msg.header;
            tester.send(newMsg);
          };

          future.onIOPub = (ioMsg) => {
            if (ioMsg.header.msg_type === 'stream') {
              // trigger onDone
              options.msgType = 'status';
              newMsg = KernelMessage.createMessage(options, { execution_state: 'idle' });
              newMsg.parent_header = msg.header;
              tester.send(newMsg);
            }
          };

          future.onDone = () => {
            doLater(() => {
              expect(future.isDisposed).to.be(true);
              done();
            });
          };
        });

      });

      it('should not dispose of KernelFuture when disposeOnDone=false', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        expect(future.onDone).to.be(null);
        expect(future.onStdin).to.be(null);
        expect(future.onReply).to.be(null);
        expect(future.onIOPub).to.be(null);

        tester.onMessage((msg) => {
          expect(msg.channel).to.be('shell');

          // send a reply
          msg.parent_header = msg.header;
          msg.channel = 'shell';
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            msg.channel = 'iopub';
            msg.header.msg_type = 'stream';
            msg.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msg);
          };

          future.onIOPub = () => {
            if (msg.header.msg_type === 'stream') {
              // trigger onDone
              msg.header.msg_type = 'status';
              (msg as KernelMessage.IStatusMsg).content.execution_state = 'idle';
              tester.send(msg);
            }
          };

          future.onDone = () => {
            doLater(() => {
              expect(future.isDisposed).to.be(false);
              expect(future.onDone).to.be(null);
              expect(future.onIOPub).to.not.be(null);
              future.dispose();
              expect(future.onIOPub).to.be(null);
              expect(future.isDisposed).to.be(true);
              done();
            });
          };

        });
      });

    });

    context('#registerMessageHook()', () => {

      it('should have the most recently registered hook run first', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            calls.push('last');
            return true;
          });

          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            calls.push('first');
            // not returning should also continue handling
            return void 0;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            // the last hook was called for the stream and the status message.
            expect(calls).to.eql(['first', 'last', 'iopub', 'first', 'last', 'iopub']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should abort processing if a hook returns false, but the done logic should still work', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            calls.push('last');
            return true;
          });

          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            calls.push('first');
            return false;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            // the last hook was called for the stream and the status message.
            expect(calls).to.eql(['first', 'first']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should process additions on the next run', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            calls.push('last');
            kernel.registerMessageHook(parent_header.msg_id, (msg) => {
              calls.push('first');
              return true;
            });
            return true;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            expect(calls).to.eql(['last', 'iopub', 'first', 'last', 'iopub']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should deactivate a hook immediately on removal', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          let toDelete = (msg: KernelMessage.IIOPubMessage) => {
            calls.push('delete');
            return true;
          }
          let toDeleteHook = kernel.registerMessageHook(parent_header.msg_id, toDelete);

          kernel.registerMessageHook(parent_header.msg_id, (msg) => {
            if (calls.length > 0) {
              // delete the hook the second time around
              toDeleteHook.dispose();
            }
            calls.push('first');
            return true;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            expect(calls).to.eql(['first', 'delete', 'iopub', 'first', 'iopub']);
            doLater(() => {
              done();
            });
          };
        });
      });

    });
  });

  describe('IFuture', () => {

    beforeEach((done) => {
      Kernel.startNew().then(k => {
        kernel = k;
        done();
      }).catch(done);
    });

    it('should have a msg attribute', () => {
      let future = kernel.requestExecute({ code: 'hello' });
      expect(typeof future.msg.header.msg_id).to.be('string');
    });

    describe('Message hooks', () => {

      it('should have the most recently registered hook run first', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          future.registerMessageHook((msg) => {
            calls.push('last');
            return true;
          });

          future.registerMessageHook((msg) => {
            calls.push('first');
            // Check to make sure we actually got the messages we expected.
            if (msg.header.msg_type === 'stream') {
              expect((msg as KernelMessage.IStreamMsg).content.text).to.be('foo1');
            } else {
              expect((msg as KernelMessage.IStatusMsg).content.execution_state).to.be('idle');
            }
            // not returning should also continue handling
            return void 0;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            // the last hook was called for the stream and the status message.
            expect(calls).to.eql(['first', 'last', 'iopub', 'first', 'last', 'iopub']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should abort processing if a hook returns false, but the done logic should still work', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          future.registerMessageHook((msg) => {
            calls.push('last');
            return true;
          });

          future.registerMessageHook((msg) => {
            calls.push('first');
            return false;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            // the last hook was called for the stream and the status message.
            expect(calls).to.eql(['first', 'first']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should process additions on the next run', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          future.registerMessageHook((msg) => {
            calls.push('last');
            future.registerMessageHook((msg) => {
              calls.push('first');
              return true;
            });
            return true;
          });

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            expect(calls).to.eql(['last', 'iopub', 'first', 'last', 'iopub']);
            doLater(() => {
              done();
            });
          };
        });
      });

      it('should deactivate message hooks immediately on removal', (done) => {
        let options: KernelMessage.IExecuteRequest = {
          code: 'test',
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: false
        };
        let future = kernel.requestExecute(options, false);
        tester.onMessage((message) => {
          // send a reply
          let parent_header = message.header;
          let msg = createMsg('shell', parent_header);
          tester.send(msg);

          future.onReply = () => {
            // trigger onIOPub with a 'stream' message
            let msgStream = createMsg('iopub', parent_header);
            msgStream.header.msg_type = 'stream';
            msgStream.content = { 'name': 'stdout', 'text': 'foo' };
            tester.send(msgStream);
            // trigger onDone
            let msgDone = createMsg('iopub', parent_header);
            msgDone.header.msg_type = 'status';
            (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
            tester.send(msgDone);
          };

          let calls: string[] = [];
          let toDelete = (msg: KernelMessage.IIOPubMessage) => {
            calls.push('delete');
            return true;
          }
          future.registerMessageHook(toDelete);

          let first = (msg: KernelMessage.IIOPubMessage) => {
            if (calls.length > 0) {
              // delete the hook the second time around
              future.removeMessageHook(toDelete);
            }
            calls.push('first');
            return true;
          }
          future.registerMessageHook(first);

          future.onIOPub = () => {
            calls.push('iopub')
          };

          future.onDone = () => {
            expect(calls).to.eql(['first', 'delete', 'iopub', 'first', 'iopub']);
            doLater(() => {
              future.dispose();
              future.removeMessageHook(first);
              done();
            });
          };
        });
      });

    });
  });

  describe('Kernel.getSpecs()', () => {

    it('should load the kernelspecs', (done) => {
      let ids = {
        'python': PYTHON_SPEC,
        'python3': PYTHON3_SPEC
      };
      tester.specs =  { 'default': 'python',
                        'kernelspecs': ids };
      Kernel.getSpecs({ baseUrl: 'localhost' }).then(specs => {
        let names = Object.keys(specs.kernelspecs);
        expect(names[0]).to.be('python');
        expect(names[1]).to.be('python3');
        done();
      }).catch(done);
    });

    it('should accept ajax options', (done) => {
      let ids = {
        'python': PYTHON_SPEC,
        'python3': PYTHON3_SPEC
      };
      tester.specs = { 'default': 'python',
                       'kernelspecs': ids };
      Kernel.getSpecs({ ajaxSettings: ajaxSettings }).then(specs => {
        let names = Object.keys(specs.kernelspecs);
        expect(names[0]).to.be('python');
        expect(names[1]).to.be('python3');
        done();
      }).catch(done);
    });

    it('should handle a missing default parameter', (done) => {
      tester.onRequest = () => {
        tester.respond(200, { 'kernelspecs': { 'python': PYTHON_SPEC } });
      };
      Kernel.getSpecs().then(specs => {
        expect(specs.default).to.be('python');
      }).then(done, done);
    });

    it('should throw for a missing kernelspecs parameter', (done) => {
      tester.onRequest = () => {
        tester.respond(200, { 'default': PYTHON_SPEC.name });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No kernelspecs found');
    });

    it('should omit an invalid kernelspec', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'python',
                               'kernelspecs': { 'R': R_SPEC,
                                                'python': PYTHON_SPEC }
        });
      };
      Kernel.getSpecs().then(specs => {
        expect(specs.default).to.be('python');
        expect(specs.kernelspecs['R']).to.be(void 0);
      }).then(done, done);
    });

    it('should handle an improper name', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper language', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.language = 1;
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'R',
                             'kernelspecs': { 'R': R_SPEC } });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper argv', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.argv = 'hello';
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No valid kernelspecs found');
    });

    it('should handle an improper display_name', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.display_name = ['hello'];
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'R',
                               'kernelspecs': { 'R': R_SPEC } });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No valid kernelspecs found');
    });

    it('should handle missing resources', (done) => {
      let R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete R_SPEC.resources;
      tester.onRequest = () => {
        tester.respond(200, { 'default': 'R',
                             'kernelspecs': { 'R': R_SPEC } });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'No valid kernelspecs found');
    });

    it('should throw an error for an invalid response', (done) => {
      tester.onRequest = () => {
        tester.respond(201, { });
      };
      let promise = Kernel.getSpecs();
      expectAjaxError(promise, done, 'Invalid Status: 201');
    });

  });

});
