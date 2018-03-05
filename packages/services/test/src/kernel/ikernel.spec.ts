// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  PageConfig, uuid
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Signal
} from '@phosphor/signaling';

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  expectFailure, KernelTester, handleRequest, createMsg
} from '../utils';


describe('Kernel.IKernel', () => {

  let defaultKernel: Kernel.IKernel;
  let specs: Kernel.ISpecModels;
  let tester: KernelTester;

  before(() => {
    return Kernel.getSpecs().then(s => {
      specs = s;
      return Kernel.startNew();
    }).then(k => {
      defaultKernel = k;
      // Start another kernel.
      return Kernel.startNew();
    });
  });

  beforeEach(() => {
    return defaultKernel.restart();
  });

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  after(() => {
    Kernel.shutdownAll();
  });

  context('#terminated', () => {

    it('should be emitted when the kernel is shut down', (done) => {
      Kernel.startNew().then(kernel => {
        kernel.terminated.connect((sender, args) => {
          expect(sender).to.be(kernel);
          expect(args).to.be(void 0);
          kernel.dispose();
          done();
        });
        return kernel.shutdown();
      }).catch(done);
    });

  });

  context('#statusChanged', () => {

    it('should be a signal following the Kernel status', () => {
      let object = {};
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'busy') {
          Signal.disconnectReceiver(object);
          called = true;
        }
      }, object);
      return defaultKernel.requestExecute({ code: 'a=1' }, true).done.then(() => {
        expect(called).to.be(true);
      });
    });

  });

  context('#iopubMessage', () => {

    it('should be emitted for an iopub message', () => {
      let object = {};
      let called = false;
      defaultKernel.iopubMessage.connect((k, msg) => {
        expect(msg.header.msg_type).to.be('status');
        Signal.disconnectReceiver(object);
        called = true;
      }, object);
      return defaultKernel.requestExecute({ code: 'a=1' }, true).done.then(() => {
        expect(called).to.be(true);
      });
    });

    it('should be emitted regardless of the sender', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
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
      }).catch(done);
    });

  });

  context('#unhandledMessage', () => {

    it('should be emitted for an unhandled message', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
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
      }).catch(done);
    });

    it('should not be emitted for an iopub signal', () => {
      tester = new KernelTester();
      return tester.start().then(kernel => {
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
    });

    it('should not be emitted for a different client session', () => {
      tester = new KernelTester();
      return tester.start().then(kernel => {
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

  });

  context('#id', () => {

    it('should be a string', () => {
      expect(typeof defaultKernel.id).to.be('string');
    });

  });

  context('#name', () => {

    it('should be a string', () => {
      expect(typeof defaultKernel.name).to.be('string');
    });

  });

  context('#model', () => {

    it('should be an IModel', () => {
      let model = defaultKernel.model;
      expect(typeof model.name).to.be('string');
      expect(typeof model.id).to.be('string');
    });

  });

  context('#username', () => {

    it('should be a string', () => {
      expect(typeof defaultKernel.username).to.be('string');
    });

  });

  context('#serverSettings', () => {

    it('should be the server settings', () => {
      expect(defaultKernel.serverSettings.baseUrl).to.be(PageConfig.getBaseUrl());
    });

  });

  context('#clientId', () => {

    it('should be a string', () => {
      expect(typeof defaultKernel.clientId).to.be('string');
    });
  });

  context('#status', () => {

    it('should get an idle status', () => {
      let object = {};
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'idle') {
          Signal.disconnectReceiver(object);
          called = true;
        }
      }, object);
      return defaultKernel.requestExecute({ code: 'a=1' }, true).done.then(() => {
        expect(called).to.be(true);
      });
    });

    it('should get a restarting status', () => {
      let object = {};
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'restarting') {
          Signal.disconnectReceiver(object);
          called = true;
        }
      }, object);
      return defaultKernel.restart().then(() => {
        expect(called).to.be(true);
      });
    });

    it('should get a busy status', () => {
      let object = {};
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'busy') {
          Signal.disconnectReceiver(object);
          called = true;
        }
      }, object);
      return defaultKernel.requestExecute({ code: 'a=1' }, true).done.then(() => {
        expect(called).to.be(true);
      });
    });

    it('should get a reconnecting status', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'reconnecting') {
            done();
          }
        });
        tester.close();
      }).catch(done);
    });

    it('should get a dead status', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            done();
          }
        });
        tester.sendStatus('dead');
      }).catch(done);
    });

    it('should handle an invalid status', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'idle') {
            done();
          }
        });
        tester.sendStatus('celebrating');
        tester.sendStatus('idle');
      }).catch(done);
    });
  });

  context('#info', () => {

    it('should get the kernel info', () => {
      return defaultKernel.ready.then(() => {
        let name = defaultKernel.info.language_info.name;
        let defaultSpecs = specs.kernelspecs[specs.default];
        expect(name).to.be(defaultSpecs.language);
      });
    });

  });

  context('#getSpec()', () => {

    it('should resolve with the spec', () => {
      return defaultKernel.getSpec().then(spec => {
        expect(spec.name).to.be(specs.default);
      });
    });

  });

  context('#isReady', () => {

    it('should test whether the kernel is ready', () => {
      let kernel: Kernel.IKernel;
      return Kernel.startNew().then(k => {
        kernel = k;
        expect(kernel.isReady).to.be(false);
        return kernel.ready;
      }).then(() => {
        expect(kernel.isReady).to.be(true);
        return kernel.shutdown();
      });
    });
  });

  context('#ready', () => {

    it('should resolve when the kernel is ready', () => {
      return defaultKernel.ready;
    });

  });

  context('#isDisposed', () => {

    it('should be true after we dispose of the kernel', () => {
      return Kernel.connectTo(defaultKernel.model).then(kernel => {
        expect(kernel.isDisposed).to.be(false);
        kernel.dispose();
        expect(kernel.isDisposed).to.be(true);
      });
    });

    it('should be safe to call multiple times', () => {
      return Kernel.connectTo(defaultKernel.model).then(kernel => {
        expect(kernel.isDisposed).to.be(false);
        expect(kernel.isDisposed).to.be(false);
        kernel.dispose();
        expect(kernel.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
      });
    });
  });

  context('#dispose()', () => {

    it('should dispose of the resources held by the kernel', () => {
      return Kernel.connectTo(defaultKernel.model).then(kernel => {
        let future = kernel.requestExecute({ code: 'foo' });
        expect(future.isDisposed).to.be(false);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
      });
    });

    it('should be safe to call twice', () => {
      return Kernel.connectTo(defaultKernel.model).then(kernel => {
        let future = kernel.requestExecute({ code: 'foo' });
        expect(future.isDisposed).to.be(false);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
        kernel.dispose();
        expect(future.isDisposed).to.be(true);
        expect(kernel.isDisposed).to.be(true);
      });
    });
  });

  context('#sendShellMessage()', () => {

    it('should send a message to the kernel', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let msg = KernelMessage.createShellMessage(options);
        kernel.sendShellMessage(msg, true);
      }).catch(done);
      tester.onMessage(msg => {
        expect(msg.header.msg_type).to.be('custom');
        done();
      });
    });

    it('should send a binary message', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
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
      }).catch(done);

      tester.onMessage(msg => {
        let decoder = new TextDecoder('utf8');
        let item = msg.buffers[0] as DataView;
        expect(decoder.decode(item)).to.be('hello');
        done();
      });
    });

    it('should fail if the kernel is dead', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
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
    });

    it('should handle out of order messages', () => {
      tester = new KernelTester();
      return tester.start().then(kernel => {
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
        });

        return future.done;
      });
    });
  });

  context('#interrupt()', () => {

    it('should interrupt and resolve with a valid server response', () => {
      return defaultKernel.interrupt();
    });

    it('should throw an error for an invalid response', (done) => {
      handleRequest(defaultKernel, 200,  { id: defaultKernel.id, name: defaultKernel.name });
      let interrupt = defaultKernel.interrupt();
      expectFailure(interrupt, done, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', (done) => {
      handleRequest(defaultKernel, 500, { });
      let interrupt = defaultKernel.interrupt();
      expectFailure(interrupt, done, '');
    });

    it('should fail if the kernel is dead', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            expectFailure(kernel.interrupt(), done, 'Kernel is dead');
          }
        });
      }).catch(done);
    });
  });

  context('#restart()', () => {

    it('should restart and resolve with a valid server response', () => {
     return defaultKernel.restart();
    });

    it('should fail if the kernel does not restart', (done) => {
      handleRequest(defaultKernel, 500, {});
      let restart = defaultKernel.restart();
      expectFailure(restart, done, '');
    });

    it('should throw an error for an invalid response', (done) => {
      let kernel = defaultKernel;
      handleRequest(kernel, 205, { id: kernel.id, name: kernel.name });
      let restart = kernel.restart();
      expectFailure(restart, done, 'Invalid response: 205 Reset Content');
    });

    it('should throw an error for an error response', (done) => {
      handleRequest(defaultKernel, 500, { });
      let restart = defaultKernel.restart();
      expectFailure(restart, done, '');
    });

    it('should throw an error for an invalid id', (done) => {
      handleRequest(defaultKernel, 200, { });
      let restart = defaultKernel.restart();
      expectFailure(restart, done);
    });

    it('should dispose of existing comm and future objects', () => {
      let kernel = defaultKernel;
      let commFuture = kernel.connectToComm('test');
      let future = kernel.requestExecute({ code: 'foo' });
      return kernel.restart().then(() => {
        expect(future.isDisposed).to.be(true);
        return commFuture;
      }).then(comm => {
        expect(comm.isDisposed).to.be(true);
      });
    });

  });

  describe('#reconnect()', () => {

    it('should reconnect the websocket', () => {
      return defaultKernel.reconnect();
    });

    it('should emit a `"reconnecting"` status', () => {
      let kernel = defaultKernel;
      let called = false;
      let object = {};
      kernel.statusChanged.connect(() => {
        if (kernel.status === 'reconnecting') {
          called = true;
          Signal.disconnectReceiver(object);
        }
      }, object);

      return kernel.reconnect().then(() => {
        expect(called).to.be(true);
      });
    });

    it('should emit a `"connected"` status', () => {
      let kernel = defaultKernel;
      let called = false;
      let object = {};
      kernel.statusChanged.connect(() => {
        if (kernel.status === 'connected') {
          called = true;
          Signal.disconnectReceiver(object);
        }
      }, object);
      return kernel.reconnect().then(() => {
        expect(called).to.be(true);
      });
    });

  });

  context('#shutdown()', () => {

    it('should shut down and resolve with a valid server response', () => {
      return Kernel.startNew().then(kernel => {
        return kernel.shutdown();
      });
    });

    it('should throw an error for an invalid response', (done) => {
      handleRequest(defaultKernel, 200, { id: uuid(), name: 'foo' });
      let shutdown = defaultKernel.shutdown();
      expectFailure(shutdown, done, 'Invalid response: 200 OK');
    });

    it('should handle a 404 error', () => {
      return Kernel.startNew().then(kernel => {
        handleRequest(kernel, 404, { });
        return kernel.shutdown();
      });
    });

    it('should throw an error for an error response', (done) => {
      handleRequest(defaultKernel, 500, { });
      let shutdown = defaultKernel.shutdown();
      expectFailure(shutdown, done, '');
    });

    it('should fail if the kernel is dead', (done) => {
      tester = new KernelTester();
      tester.start().then(kernel => {
        tester.sendStatus('dead');
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            expectFailure(kernel.shutdown(), done, 'Kernel is dead');
          }
        });
      }).catch(done);
    });

    it('should dispose of all kernel instances', () => {
      let kernel0: Kernel.IKernel;
      let kernel1: Kernel.IKernel;
      return Kernel.startNew().then(k => {
        kernel0 = k;
        return Kernel.connectTo(kernel0.model);
      }).then(k => {
        kernel1 = k;
        return kernel0.shutdown();
      }).then(() => {
        expect(kernel1.isDisposed).to.be(true);
      });
    });

  });

  context('#requestKernelInfo()', () => {

    it('should resolve the promise', () => {
      return defaultKernel.requestKernelInfo().then((msg) => {
        let name = msg.content.language_info.name;
        expect(name).to.be.ok();
      });
    });
  });

  context('#requestComplete()', () => {

    it('should resolve the promise', () => {
      let options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      return defaultKernel.requestComplete(options);
    });

    it('should reject the promise if the kernel is dead', (done) => {
      let options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            let promise = kernel.requestComplete(options);
            expectFailure(promise, done, 'Kernel is dead');
          }
        });
        tester.sendStatus('dead');
      }).catch(done);
    });
  });

  context('#requestInspect()', () => {

    it('should resolve the promise', () => {
      let options: KernelMessage.IInspectRequest = {
        code: 'hello',
        cursor_pos: 4,
        detail_level: 0
      };
      return defaultKernel.requestInspect(options);
    });

  });

  context('#requestIsComplete()', () => {

    it('should resolve the promise', () => {
      let options: KernelMessage.IIsCompleteRequest = {
        code: 'hello'
      };
      return defaultKernel.requestIsComplete(options);
    });

  });

  context('#requestHistory()', () => {

    it('should resolve the promise', () => {
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
      return defaultKernel.requestHistory(options);
    });
  });

  context('#sendInputReply()', () => {

    it('should resolve the promise', (done) => {
      tester = new KernelTester();
      tester.onMessage((msg) => {
        expect(msg.header.msg_type).to.be('input_reply');
        done();
      });
      tester.start().then(kernel => {
        kernel.sendInputReply({ value: 'test' });
      }).catch(done);
    });

    it('should fail if the kernel is dead', (done) => {
      tester = new KernelTester();
      tester.sendStatus('dead');
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          try {
            kernel.sendInputReply({ value: 'test' });
          } catch (err) {
            expect(err.message).to.be('Kernel is dead');
            done();
          }
        });
      }).catch(done);
    });
  });

  context('#requestExecute()', () => {

    it('should send and handle incoming messages', () => {
      let newMsg: KernelMessage.IMessage;
      let content: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };

      let options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: defaultKernel.username,
        session: defaultKernel.clientId
      };

      let future: Kernel.IFuture;
      tester = new KernelTester();

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

      });

      return tester.start().then(kernel => {
        future = kernel.requestExecute(content);
        return future.done;
      }).then(() => {
        expect(future.isDisposed).to.be(true);
      });

    });

    it('should not dispose of KernelFuture when disposeOnDone=false', () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let future = defaultKernel.requestExecute(options, false);
      return future.done.then(() => {
        expect(future.isDisposed).to.be(false);
        future.dispose();
        expect(future.isDisposed).to.be(true);
      });
    });

  });

  context('#registerMessageHook()', () => {

    it('should have the most recently registered hook run first', () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let calls: string[] = [];
      let future: Kernel.IFuture;

      let kernel: Kernel.IKernel;

      tester = new KernelTester();
      tester.onMessage((message) => {
        // send a reply
        let parentHeader = message.header;
        let msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          let msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { 'name': 'stdout', 'text': 'foo' };
          tester.send(msgStream);
          // trigger onDone
          let msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          calls.push('last');
          return true;
        });

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          calls.push('first');
          // not returning should also continue handling
          return void 0;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      return tester.start().then(k => {
        kernel = k;
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        // the last hook was called for the stream and the status message.
        expect(calls).to.eql(['first', 'last', 'iopub', 'first', 'last', 'iopub']);
      });
    });

    it('should abort processing if a hook returns false, but the done logic should still work', () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let calls: string[] = [];

      tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage((message) => {
        // send a reply
        let parentHeader = message.header;
        let msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          let msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { 'name': 'stdout', 'text': 'foo' };
          tester.send(msgStream);
          // trigger onDone
          let msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          calls.push('last');
          return true;
        });

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          calls.push('first');
          return false;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      return tester.start().then(k => {
        kernel = k;
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        // the last hook was called for the stream and the status message.
        expect(calls).to.eql(['first', 'first']);
      });
    });

    it('should process additions on the next run', () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let calls: string[] = [];
      tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage((message) => {
        // send a reply
        let parentHeader = message.header;
        let msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          let msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { 'name': 'stdout', 'text': 'foo' };
          tester.send(msgStream);
          // trigger onDone
          let msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          calls.push('last');
          kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
            calls.push('first');
            return true;
          });
          return true;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });
      return tester.start().then(k => {
        kernel = k;
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        expect(calls).to.eql(['last', 'iopub', 'first', 'last', 'iopub']);
      });
    });

    it('should deactivate a hook immediately on removal', () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let calls: string[] = [];
      tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage((message) => {
        // send a reply
        let parentHeader = message.header;
        let msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          let msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { 'name': 'stdout', 'text': 'foo' };
          tester.send(msgStream);
          // trigger onDone
          let msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state = 'idle';
          tester.send(msgDone);
        };

        let toDelete = (msg: KernelMessage.IIOPubMessage) => {
          calls.push('delete');
          return true;
        };
        let toDeleteHook = kernel.registerMessageHook(parentHeader.msg_id, toDelete);

        kernel.registerMessageHook(parentHeader.msg_id, (msg) => {
          if (calls.length > 0) {
            // delete the hook the second time around
            toDeleteHook.dispose();
          }
          calls.push('first');
          return true;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      return tester.start().then(k => {
        kernel = k;
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        expect(calls).to.eql(['first', 'delete', 'iopub', 'first', 'iopub']);
      });
    });

  });

});
