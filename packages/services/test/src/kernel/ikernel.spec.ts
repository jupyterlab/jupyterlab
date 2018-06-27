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
  expectFailure, KernelTester, handleRequest, createMsg, testEmission
} from '../utils';


describe('Kernel.IKernel', () => {
  let defaultKernel: Kernel.IKernel;
  let specs: Kernel.ISpecModels;

  before(async () => {
    specs = await Kernel.getSpecs();
  });

  beforeEach(async () => {
    defaultKernel = await Kernel.startNew();
    await defaultKernel.ready;
  });

  afterEach(async () => {
    if (defaultKernel.status !== 'dead') {
      await defaultKernel.shutdown();
      defaultKernel.dispose();
    }
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
        find: (k, msg) => (msg.header.msg_id === msgId)
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
      await tester.shutdown();
      tester.dispose();
    });
  });

  context('#unhandledMessage', () => {
    let tester: KernelTester;
    beforeEach(() => { tester = new KernelTester(); });
    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });

    it('should be emitted for an unhandled message', async () => {
      const kernel = await tester.start();
      const msgId = uuid();
      const emission = testEmission(kernel.unhandledMessage, {
        find: (k, msg) => (msg.header.msg_id === msgId)
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
      tester.sendStatus(uuid(), 'idle');

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
      // one with the current client session. The unhandledMessage signal should
      // only emit once for the current session message.
      const msgId = 'message from right session';
      const emission = testEmission(kernel.unhandledMessage, {
        test: (k, msg) => {
          expect((msg.parent_header as KernelMessage.IHeader).session).to.be(kernel.clientId);
          expect(msg.header.msg_id).to.be(msgId);
        }
      });

      // Send a shell message with the wrong client (parent) session.
      let msg1 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: 'message from wrong session'
      });
      msg1.parent_header = {session: 'wrong session'};
      tester.send(msg1);

      // Send a shell message with the right client (parent) session.
      let msg2 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
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
    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });

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
      const msgId = 'idle status';

      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect((args.msg.header as any).msg_id).to.be(msgId);
          expect(args.direction).to.be('recv');
        }
      });
      tester.sendStatus(msgId, 'idle');
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

    it('should get an idle status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'idle'
      });
      await defaultKernel.requestExecute({ code: 'a=1'}).done;
      await emission;
    });

    // TODO: seems to be sporadically timing out if we await the restart. See
    // https://github.com/jupyter/notebook/issues/3705.
    it('should get a restarting status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'restarting'
      });
      defaultKernel.restart();
      await emission;
    });

    it('should get a busy status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'busy'
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      await emission;
    });

    it('should get a reconnecting status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      await kernel.ready;
      const emission = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'reconnecting'
      });

      await tester.close();
      await emission;
      tester.dispose();
    });

    it('should get a dead status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      await kernel.ready;
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;
      tester.dispose();
    });

    it('should not emit an invalid status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      await kernel.ready;
      const emission = testEmission(kernel.statusChanged, {
        test: (k, status) => {
          expect(status).to.be('busy');
          expect(kernel.status).to.be('busy');
        }
      });

      // This invalid status is not emitted.
      tester.sendStatus(uuid(), 'invalid-status' as Kernel.Status);

      // This valid status is emitted.
      tester.sendStatus(uuid(), 'busy');

      await emission;
      tester.dispose();
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

  context('#sendShellMessage()', () => {

    it('should send a message to the kernel', async () => {
      const tester = new KernelTester();
      let kernel = await tester.start();
      let done = new PromiseDelegate<void>();
      let msgId = uuid();

      tester.onMessage(msg => {
        try {
          expect(msg.header.msg_id).to.be(msgId);
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve(null);
      });

      let options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId
      };
      let msg = KernelMessage.createShellMessage(options);
      kernel.sendShellMessage(msg, true);
      await done;
      await tester.shutdown();
      tester.dispose();
    });

    it('should send a binary message', async () => {
      const tester = new KernelTester();
      let kernel = await tester.start();
      let done = new PromiseDelegate<void>();
      let msgId = uuid();

      tester.onMessage(msg => {
        try {
          let decoder = new TextDecoder('utf8');
          let item = msg.buffers[0] as DataView;
          expect(decoder.decode(item)).to.be('hello');
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve(null);
      });

      let options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId
      };
      let encoder = new TextEncoder();
      let data = encoder.encode('hello');
      let msg = KernelMessage.createShellMessage(options, {}, {}, [data, data.buffer]);
      kernel.sendShellMessage(msg, true);
      await done;
      await tester.shutdown();
      tester.dispose();
    });

    it('should fail if the kernel is dead', async () => {
      const tester = new KernelTester();
      let kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;

      let options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId
      };
      let msg = KernelMessage.createShellMessage(options);
      expect(() => {kernel.sendShellMessage(msg, true); }).to.throwException(/Kernel is dead/);
      await tester.shutdown();
      tester.dispose();
    });

    it('should handle out of order messages', async () => {
      // This test that a future.done promise resolves when a status idle and
      // reply come through, even if the status comes first.
      const tester = new KernelTester();
      let kernel = await tester.start();

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
      await future.done;
      await tester.shutdown();
      tester.dispose();
    });
  });

  context('#interrupt()', () => {

    it('should interrupt and resolve with a valid server response', async () => {
      let kernel = await Kernel.startNew();
      await kernel.ready;
      await kernel.interrupt();
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      handleRequest(defaultKernel, 200,  { id: defaultKernel.id, name: defaultKernel.name });
      let interrupt = defaultKernel.interrupt();
      await expectFailure(interrupt, null, 'Invalid response: 200 OK');
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, { });
      let interrupt = defaultKernel.interrupt();
      await expectFailure(interrupt, null, '');
    });

    it('should fail if the kernel is dead', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;
      await expectFailure(kernel.interrupt(), null, 'Kernel is dead');
      tester.dispose();
    });
  });

  context('#restart()', () => {

    // TODO: seems to be sporadically timing out if we await the restart. See
    // https://github.com/jupyter/notebook/issues/3705.
    it('should restart and resolve with a valid server response', async () => {
     defaultKernel.restart();
     await defaultKernel.ready;
    });

    it('should fail if the kernel does not restart', async () => {
      handleRequest(defaultKernel, 500, {});
      let restart = defaultKernel.restart();
      await expectFailure(restart, null, '');
    });

    it('should throw an error for an invalid response', async () => {
      let kernel = defaultKernel;
      handleRequest(kernel, 205, { id: kernel.id, name: kernel.name });
      await expectFailure(kernel.restart(), null, 'Invalid response: 205 Reset Content');
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, { });
      let restart = defaultKernel.restart();
      await expectFailure(restart);
    });

    it('should throw an error for an invalid id', async () => {
      handleRequest(defaultKernel, 200, { });
      let restart = defaultKernel.restart();
      await expectFailure(restart);
    });

    // TODO: seems to be sporadically timing out if we await the restart. See
    // https://github.com/jupyter/notebook/issues/3705.
    it('should dispose of existing comm and future objects', async () => {
      let kernel = defaultKernel;
      let comm = kernel.connectToComm('test');
      let future = kernel.requestExecute({ code: 'foo' });
      kernel.restart();
      await kernel.ready;
      expect(future.isDisposed).to.be(true);
      expect(comm.isDisposed).to.be(true);
    });

  });

  describe('#reconnect()', () => {

    it('should reconnect the websocket', () => {
      return defaultKernel.reconnect();
    });

    it('should emit `"reconnecting"`, then `"connected"` status', async () => {
      let connectedEmission: Promise<void>;
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'reconnecting',
        test: () => {
          connectedEmission = testEmission(defaultKernel.statusChanged, {
            find: () => defaultKernel.status === 'connected'
          });
        }
      });

      await defaultKernel.reconnect();
      await emission;
      await connectedEmission;
    });

  });

  context('#shutdown()', () => {

    it('should shut down and resolve with a valid server response', async () => {
      let kernel = await Kernel.startNew();
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      handleRequest(defaultKernel, 200, { id: uuid(), name: 'foo' });
      let shutdown = defaultKernel.shutdown();
      await expectFailure(shutdown, null, 'Invalid response: 200 OK');
    });

    it('should handle a 404 error', async () => {
      let kernel = await Kernel.startNew();
      handleRequest(kernel, 404, { });
      await kernel.shutdown();
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, { });
      let shutdown = defaultKernel.shutdown();
      await expectFailure(shutdown, null, '');
    });

    it('should fail if the kernel is dead', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;
      await expectFailure(kernel.shutdown(), null, 'Kernel is dead');
      tester.dispose();
    });

    it('should dispose of all kernel instances', async () => {
      let kernel0 = await Kernel.startNew();
      let kernel1 = await Kernel.connectTo(kernel0.model);
      await kernel0.ready;
      await kernel1.ready;
      await kernel0.shutdown();
      expect(kernel0.isDisposed).to.be(true);
      expect(kernel1.isDisposed).to.be(true);
    });

  });

  context('#requestKernelInfo()', () => {

    it('should resolve the promise', async () => {
      const msg = await defaultKernel.requestKernelInfo();
      let name = msg.content.language_info.name;
      expect(name).to.be.ok();
    });
  });

  context('#requestComplete()', () => {

    it('should resolve the promise', async () => {
      let options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      await defaultKernel.requestComplete(options);
    });

    it('should reject the promise if the kernel is dead', async () => {
      let options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;
      expectFailure(kernel.requestComplete(options), null, 'Kernel is dead');
      tester.dispose();
    });
  });

  context('#requestInspect()', () => {

    it('should resolve the promise', async () => {
      let options: KernelMessage.IInspectRequest = {
        code: 'hello',
        cursor_pos: 4,
        detail_level: 0
      };
      await defaultKernel.requestInspect(options);
    });

  });

  context('#requestIsComplete()', () => {

    it('should resolve the promise', async () => {
      let options: KernelMessage.IIsCompleteRequest = {
        code: 'hello'
      };
      await defaultKernel.requestIsComplete(options);
    });

  });

  context('#requestHistory()', () => {

    it('should resolve the promise', async () => {
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
      await defaultKernel.requestHistory(options);
    });
  });

  context('#sendInputReply()', () => {

    it('should send an input_reply message', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const done = new PromiseDelegate<void>();
      tester.onMessage((msg) => {
        expect(msg.header.msg_type).to.be('input_reply');
        done.resolve(null);
      });
      kernel.sendInputReply({ value: 'test' });
      await done;
      await tester.shutdown();
      tester.dispose();
    });

    it('should fail if the kernel is dead', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(uuid(), 'dead');
      await dead;
      expect(() => { kernel.sendInputReply({ value: 'test' }); }).to.throwException(/Kernel is dead/);
      tester.dispose();
    });
  });

  context('#requestExecute()', () => {

    it('should send and handle incoming messages', async () => {
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

      const kernel = await tester.start();
      future = kernel.requestExecute(content);
      await future.done;
      expect(future.isDisposed).to.be(true);
      await tester.shutdown();
      tester.dispose();
    });

    it('should not dispose of KernelFuture when disposeOnDone=false', async () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let future = defaultKernel.requestExecute(options, false);
      await future.done;
      expect(future.isDisposed).to.be(false);
      future.dispose();
      expect(future.isDisposed).to.be(true);
    });

  });

  context('#registerMessageHook()', () => {

    it('should have the most recently registered hook run first', async () => {
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

        kernel.registerMessageHook(parentHeader.msg_id, async (msg) => {
          // Make this hook call asynchronous
          await calls.push('last');
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

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      // the last hook was called for the stream and the status message.
      expect(calls).to.eql(['first', 'last', 'iopub', 'first', 'last', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should abort processing if a hook returns false, but the done logic should still work', async () => {
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

        future.onIOPub = async () => {
          await calls.push('iopub');
        };
      });

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      // the last hook was called for the stream and the status message.
      expect(calls).to.eql(['first', 'first']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should process additions on the next run', async () => {
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

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      expect(calls).to.eql(['last', 'iopub', 'first', 'last', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should deactivate a hook immediately on removal', async () => {
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
        kernel.registerMessageHook(parentHeader.msg_id, toDelete);
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

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      expect(calls).to.eql(['first', 'delete', 'iopub', 'first', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });

  });

  context('handles messages asynchronously', () => {

    // TODO: Also check that messages are canceled appropriately. In particular, when
    // a kernel is restarted, then a message is sent for a comm open from the
    // old session, the comm open should be canceled.

    it('should run handlers in order', async () => {
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: true,
        stop_on_error: false
      };

      const tester = new KernelTester();
      const kernel = await tester.start();
      const future = kernel.requestExecute(options, false);

      // The list of emissions from the anyMessage signal.
      const msgSignal: string[][] = [];
      const msgSignalExpected: string[][] = [];

      // The list of message processing calls
      const calls: string[][] = [];
      const callsExpected: string[][] = [];

      function pushIopub(msgId: string) {
        callsExpected.push([msgId, 'future hook a']);
        callsExpected.push([msgId, 'future hook b']);
        callsExpected.push([msgId, 'kernel hook a']);
        callsExpected.push([msgId, 'kernel hook b']);
        callsExpected.push([msgId, 'iopub']);
        msgSignalExpected.push([msgId, 'iopub']);
      }

      function pushCommOpen(msgId: string) {
        pushIopub(msgId);
        callsExpected.push([msgId, 'comm open']);
      }

      function pushCommMsg(msgId: string) {
        pushIopub(msgId);
        callsExpected.push([msgId, 'comm msg']);
      }

      function pushCommClose(msgId: string) {
        pushIopub(msgId);
        callsExpected.push([msgId, 'comm close']);
      }

      function pushStdin(msgId: string) {
        callsExpected.push([msgId, 'stdin']);
        msgSignalExpected.push([msgId, 'stdin']);
      }

      function pushReply(msgId: string) {
        callsExpected.push([msgId, 'reply']);
        msgSignalExpected.push([msgId, 'shell']);
      }

      let anyMessageDone = new PromiseDelegate();
      let handlingBlock = new PromiseDelegate();

      tester.onMessage((message) => {
        tester.onMessage(() => { return; });
        tester.parentHeader = message.header;

        pushIopub(tester.sendStatus('busy', 'busy'));
        pushIopub(tester.sendStream('stdout', { 'name': 'stdout', 'text': 'foo' }));
        pushCommOpen(tester.sendCommOpen('comm open', {target_name: 'commtarget', comm_id: 'commid', data: {}}));
        pushIopub(tester.sendDisplayData('display 1', {data: {}, metadata: {}}));
        pushCommMsg(tester.sendCommMsg('comm 1', {comm_id: 'commid', data: {}}));
        pushCommMsg(tester.sendCommMsg('comm 2', {comm_id: 'commid', data: {}}));
        pushCommClose(tester.sendCommClose('comm close', {comm_id: 'commid', data: {}}));
        pushStdin(tester.sendInputRequest('stdin', {prompt: '', password: false}));
        pushIopub(tester.sendDisplayData('display 2', {data: {}, metadata: {}, transient: {display_id: 'displayid'} }));
        pushIopub(tester.sendUpdateDisplayData('update display', {data: {}, metadata: {}, transient: {display_id: 'displayid'}}));
        pushIopub(tester.sendExecuteResult('execute result', {execution_count: 1, data: {}, metadata: {}}));
        pushIopub(tester.sendStatus('idle', 'idle'));
        pushReply(tester.sendExecuteReply('execute reply', {}));

        tester.parentHeader = undefined;
      });

      kernel.anyMessage.connect((k, args) => {
        msgSignal.push([args.msg.header.msg_id, args.msg.channel]);
        if (args.msg.header.msg_id === 'execute reply') {
          anyMessageDone.resolve(undefined);
        }
      });

      kernel.registerMessageHook(future.msg.header.msg_id, async (msg) => {
        // Make this hook call asynchronous
        await calls.push([msg.header.msg_id, 'kernel hook b']);
        return true;
      });

      kernel.registerMessageHook(future.msg.header.msg_id, async (msg) => {
        calls.push([msg.header.msg_id, 'kernel hook a']);
        return true;
      });

      kernel.registerCommTarget('commtarget', async (comm, msg) => {
        await calls.push([msg.header.msg_id, 'comm open']);

        comm.onMsg = async (msg) => {
          await calls.push([msg.header.msg_id, 'comm msg']);
        };
        comm.onClose = async (msg) => {
          await calls.push([msg.header.msg_id, 'comm close']);
        };
      });

      future.registerMessageHook(async (msg) => {
        await calls.push([msg.header.msg_id, 'future hook b']);
        return true;
      });

      future.registerMessageHook(async (msg) => {
        // Delay processing until after we've checked the anyMessage results.
        await handlingBlock.promise;
        await calls.push([msg.header.msg_id, 'future hook a']);
        return true;
      });

      future.onIOPub = async (msg) => {
        await calls.push([msg.header.msg_id, 'iopub']);
      };

      future.onStdin = async (msg) => {
        await calls.push([msg.header.msg_id, 'stdin']);
      };

      future.onReply = async (msg) => {
        await calls.push([msg.header.msg_id, 'reply']);
      };

      // Give the kernel time to receive and queue up the messages.
      await anyMessageDone.promise;

      // At this point, the synchronous anyMessage signal should have been
      // emitted for every message, but no actual message handling should have
      // happened.
      expect(msgSignal).to.eql(msgSignalExpected);
      expect(calls).to.eql([]);

      // Release the lock on message processing.
      handlingBlock.resolve(undefined);
      await future.done;
      expect(calls).to.eql(callsExpected);

      await tester.shutdown();
      tester.dispose();
    });



  });
});
