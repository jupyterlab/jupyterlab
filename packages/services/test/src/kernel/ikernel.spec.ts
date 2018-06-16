// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  PageConfig, uuid
} from '@jupyterlab/coreutils';

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  Signal
} from '@phosphor/signaling';

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  expectFailure, KernelTester, handleRequest, createMsg, sleep, testEmission
} from '../utils';


describe.only('Kernel.IKernel', () => {
  let defaultKernel: Kernel.IKernel;
  let specs: Kernel.ISpecModels;

  before(async () => {
    specs = await Kernel.getSpecs();
    // defaultKernel = await Kernel.startNew();
  });

  beforeEach(async () => {
    defaultKernel = await Kernel.startNew();
    await defaultKernel.ready;
    console.log(`beforeEach: starting kernel ${defaultKernel.id.slice(0, 6)}`);

    // await defaultKernel.restart();
    // await defaultKernel.ready;
  });

  afterEach(async () => {
    if (defaultKernel.status !== 'dead') {
      console.log(`afterEach: shutting down kernel ${defaultKernel.id.slice(0, 6)}`);
      await defaultKernel.shutdown();
      defaultKernel.dispose();
    }
    await sleep(500);
    console.log();
    console.log('-----------------------------------------------------------------------------------------');
  });

  after(async () => {
    await Kernel.shutdownAll();
  });

  context('#terminated', () => {

    it('should be emitted when the kernel is shut down', async () => {
      let called = false;
      defaultKernel.terminated.connect((sender, args) => {
        expect(sender).to.be(defaultKernel);
        expect(args).to.be(void 0);
        called = true;
      });
      await defaultKernel.shutdown();
      expect(called).to.be(true);
    });

  });

  context('#statusChanged', () => {

    it('should be a signal following the Kernel status', async () => {
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'busy') {
          called = true;
        }
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).to.be(true);
    });

  });

  context('#iopubMessage', async () => {

    it('should be emitted for an iopub message', async () => {
      let called = false;
      defaultKernel.iopubMessage.connect((k, msg) => {
        called = true;
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).to.be(true);
    });

    it('should be emitted regardless of the sender', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const msgId = uuid();
      const emission = testEmission(kernel.iopubMessage, {
        shouldTest: (k, msg) => (msg.header.msg_id === msgId)
      });
      let msg = KernelMessage.createMessage({
        msgType: 'status',
        channel: 'iopub',
        session: tester.serverSessionId,
        msgId
      }) as KernelMessage.IStatusMsg;
      msg.content.execution_state = 'idle';
      tester.send(msg);
      await emission;
      tester.dispose();
    });
  });

  context('#unhandledMessage', () => {
    let tester: KernelTester;
    beforeEach(() => { tester = new KernelTester(); });
    afterEach(() => { tester.dispose(); });

    it('should be emitted for an unhandled message', async () => {
      const kernel = await tester.start();
      const msgId = uuid();
      const emission = testEmission(kernel.unhandledMessage, {
        shouldTest: (k, msg) => (msg.header.msg_id === msgId)
      });
      let msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = {session: kernel.clientId};
      tester.send(msg);
      await emission;
    });

    it('should not be emitted for an iopub signal', async () => {
      const kernel = await tester.start();

      // We'll send two messages, first an iopub message, then a shell message.
      // The unhandledMessage signal should only emit once for the shell message.
      const msgId = uuid();
      const emission = testEmission(kernel.unhandledMessage, {
        test: (k, msg) => { expect(msg.header.msg_id).to.be(msgId); }
      });

      // Send an iopub message.
      tester.sendStatus('idle');

      // Send a shell message.
      let msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = {session: kernel.clientId};
      tester.send(msg);

      await emission;
    });

    it('should not be emitted for a different client session', async () => {
      const kernel = await tester.start();

      // We'll send two messages, first a message with a different session, then
      // one with the current session. The unhandledMessage signal should only
      // emit once for the current session message.
      const msgId = uuid();
      const emission = testEmission(kernel.unhandledMessage, {
        test: (k, msg) => {
          expect(msg.header.session).to.be(kernel.clientId);
          expect(msg.header.msg_id).to.be(msgId);
        }
      });

      // Send a shell message with a different session.
      let msg1 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
      });
      msg1.parent_header = {session: 'wrong session'};
      tester.send(msg1);

      // Send a shell message.
      let msg2 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: kernel.clientId,
        msgId: msgId
      });
      msg2.parent_header = {session: kernel.clientId};
      tester.send(msg2);

      await emission;
    });

  });

  context('#anyMessage', () => {
    let tester: KernelTester;
    beforeEach(() => { tester = new KernelTester(); });
    afterEach(() => { tester.dispose(); });

    it('should be emitted for an unhandled message', async () => {
      const kernel = await tester.start();
      const msgId = uuid();

      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect(args.msg.header.msg_id).to.be(msgId);
          expect(args.msg.header.msg_type).to.be('foo');
          expect(args.direction).to.be('recv');
          }
      });

      let msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = {session: kernel.clientId};
      tester.send(msg);
      await emission;
    });

    it('should be emitted for an iopub message', async () => {
      const kernel = await tester.start();
      const msgId = uuid();

      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect((args.msg.parent_header as any).msg_id).to.be(msgId);
          expect(args.direction).to.be('recv');
        }
      });
      tester.sendStatus('idle', {
        msg_id: msgId,
        session: kernel.clientId,
        username: '',
        version: '',
        msg_type: ''});
      await emission;
    });

    it('should be emitted for an stdin message', async () => {
      const kernel = await tester.start();
      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect(args.msg.content.value).to.be('foo');
          expect(args.direction).to.be('send');
        }
      });
      kernel.sendInputReply({value: 'foo'});
      await emission;
    });

    it('should not be emitted for a different client session', async () => {
      const kernel = await tester.start();

      // We'll send two messages, first a message with a different session, then
      // one with the current session. The anyMessage signal should only
      // emit once for the current session message.
      const msgId = uuid();
      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect(args.msg.header.msg_id).to.be(msgId);
          expect((args.msg.parent_header as any).session).to.be(kernel.clientId);
          expect(args.msg.header.msg_type).to.be('foo');
          expect(args.direction).to.be('recv');
        }
      });

      // Send a shell message with a different session.
      let msg1 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: 'wrong message'
      });
      msg1.parent_header = {session: 'different session'};
      tester.send(msg1);

      // Send a shell message with the correct session.
      let msg2 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg2.parent_header = {session: kernel.clientId};
      tester.send(msg2);
      await emission;
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

    it.only('should get an idle status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        shouldTest: () => defaultKernel.status === 'idle'
      });
      await defaultKernel.requestExecute({ code: 'a=1'}).done;
      await emission;
    });

    it('should get a restarting status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        shouldTest: () => defaultKernel.status === 'restarting'
      });
      await defaultKernel.restart();
      await emission;
    });

    it('should get a busy status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        shouldTest: () => defaultKernel.status === 'busy'
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      await emission;
    });

    it.skip('should get a reconnecting status', (done) => {
      const tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'reconnecting') {
            done();
          }
        });
        tester.close();
      }).catch(done);
    });

    it.skip('should get a dead status', (done) => {
      const tester = new KernelTester();
      tester.start().then(kernel => {
        kernel.statusChanged.connect(() => {
          if (kernel.status === 'dead') {
            done();
          }
        });
        tester.sendStatus('dead');
      }).catch(done);
    });

    it.skip('should handle an invalid status', (done) => {
      const tester = new KernelTester();
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
      let name = defaultKernel.info.language_info.name;
      let defaultSpecs = specs.kernelspecs[specs.default];
      expect(name).to.be(defaultSpecs.language);
    });

  });

  context('#getSpec()', () => {

    it('should resolve with the spec', async () => {
      let spec = await defaultKernel.getSpec();
      expect(spec.name).to.be(specs.default);
    });

  });

  context('#isReady', () => {

    it('should test whether the kernel is ready', async () => {
      let kernel = await Kernel.startNew();
      expect(kernel.isReady).to.be(false);
      await kernel.ready;
      expect(kernel.isReady).to.be(true);
      await kernel.shutdown();
    });
  });

  context('#ready', () => {

    it('should resolve when the kernel is ready', async () => {
      await defaultKernel.ready;
    });

  });

  context('#isDisposed', () => {

    it('should be true after we dispose of the kernel', async () => {
      let kernel = await Kernel.connectTo(defaultKernel.model);
      expect(kernel.isDisposed).to.be(false);
      kernel.dispose();
      expect(kernel.isDisposed).to.be(true);
    });

    it('should be safe to call multiple times', async () => {
      let kernel = await Kernel.connectTo(defaultKernel.model);
      expect(kernel.isDisposed).to.be(false);
      expect(kernel.isDisposed).to.be(false);
      kernel.dispose();
      expect(kernel.isDisposed).to.be(true);
      expect(kernel.isDisposed).to.be(true);
    });
  });

  context('#dispose()', () => {

    it('should dispose of the resources held by the kernel', async () => {
      let kernel = await Kernel.connectTo(defaultKernel.model);
      let future = kernel.requestExecute({ code: 'foo' });
      expect(future.isDisposed).to.be(false);
      kernel.dispose();
      expect(future.isDisposed).to.be(true);
    });

    it('should be safe to call twice', async () => {
      const kernel = await Kernel.connectTo(defaultKernel.model);
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

  context.skip('#sendShellMessage()', () => {

    it('should send a message to the kernel', (done) => {
      const tester = new KernelTester();
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
      const tester = new KernelTester();
      tester.start().then(kernel => {
        let options: KernelMessage.IOptions = {
          msgType: 'custom',
          channel: 'shell',
          username: kernel.username,
          session: kernel.clientId
        };
        let encoder = new TextEncoder();
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
      const tester = new KernelTester();
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
      const tester = new KernelTester();
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

    it('should interrupt and resolve with a valid server response', async () => {
      await defaultKernel.interrupt();
    });

    it.only('should throw an error for an invalid response', async () => {
      handleRequest(defaultKernel, 200,  { id: defaultKernel.id, name: defaultKernel.name });
      let interrupt = defaultKernel.interrupt();
      await expectFailure(interrupt, null, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', async (done) => {
      handleRequest(defaultKernel, 500, { });
      let interrupt = defaultKernel.interrupt();
      await expectFailure(interrupt, null, '');
    });

    it.only('should fail if the kernel is dead', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        shouldTest: () => kernel.status === 'dead'
      });
      tester.sendStatus('dead');
      await dead;
      await kernel.interrupt();
      await expectFailure(kernel.interrupt(), null, 'Kernel is dead');
      // tester.dispose();
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
      const tester = new KernelTester();
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
      const tester = new KernelTester();
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
      const tester = new KernelTester();
      tester.onMessage((msg) => {
        expect(msg.header.msg_type).to.be('input_reply');
        done();
      });
      tester.start().then(kernel => {
        kernel.sendInputReply({ value: 'test' });
      }).catch(done);
    });

    it('should fail if the kernel is dead', (done) => {
      const tester = new KernelTester();
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
      const tester = new KernelTester();

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

      const tester = new KernelTester();
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

      const tester = new KernelTester();
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
      const tester = new KernelTester();
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
      const tester = new KernelTester();
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
            kernel.removeMessageHook(parentHeader.msg_id, toDelete);
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
