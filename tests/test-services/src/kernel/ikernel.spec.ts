// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PageConfig } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { JSONObject, PromiseDelegate } from '@phosphor/coreutils';

import { Kernel, KernelMessage } from '@jupyterlab/services/src/kernel';

import {
  expectFailure,
  KernelTester,
  handleRequest,
  createMsg,
  testEmission
} from '../utils';

describe('Kernel.IKernel', () => {
  let tester: KernelTester;

  beforeAll(async () => {
    jest.setTimeout(20000);
  });

  afterAll(async () => {
    await Kernel.shutdownAll();
  });

  // Tests should clean up after themselves, in that they should shut down
  // resources they created. We check that a test cleans up its resources (and
  // fail if it doesn't), and then we clean up the resources to make sure that
  // one test not cleaning up doesn't affect succeeding tests. Since afterEach
  // handlers are run in reverse order, you see below the final cleanup first,
  // then the cleanup check.

  afterEach(async () => {
    if (tester && !tester.isDisposed) {
      tester.dispose();
    }
    await Kernel.shutdownAll();
  });

  afterEach(async () => {
    if (tester) {
      // Failure indicates the test did not dispose the kernel tester it
      // created.
      expect(tester.isDisposed).to.be.true;
    }
    let running = await Kernel.listRunning();
    // Failure indicates the test did not shut down kernels it started.
    expect(running.length).to.equal(0);
  });

  describe('#terminated', () => {
    it('should be emitted when the kernel is shut down', async () => {
      const kernel = await Kernel.startNew();
      let called = false;
      kernel.terminated.connect((sender, args) => {
        expect(sender).to.equal(kernel);
        expect(args).to.be.undefined;
        called = true;
      });
      await kernel.shutdown();
      expect(called).to.equal(true);
    });
  });

  describe('#statusChanged', () => {
    it('should be a signal following the Kernel status', async () => {
      const kernel = await Kernel.startNew();
      let called = false;
      kernel.statusChanged.connect(() => {
        if (kernel.status === 'busy') {
          called = true;
        }
      });
      await kernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).to.equal(true);
      await kernel.shutdown();
    });
  });

  describe('#iopubMessage', async () => {
    it('should be emitted for an iopub message', async () => {
      const kernel = await Kernel.startNew();
      let called = false;
      kernel.iopubMessage.connect((k, msg) => {
        called = true;
      });
      await kernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).to.equal(true);
      await kernel.shutdown();
    });

    it('should be emitted regardless of the sender', async () => {
      tester = new KernelTester();
      const kernel = await tester.start();
      const msgId = UUID.uuid4();
      const emission = testEmission(kernel.iopubMessage, {
        find: (k, msg) => {
          console.log('Testing emission', msg);
          return msg.header.msg_id === msgId;
        }
      });
      const msg = KernelMessage.createMessage({
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

  describe('#unhandledMessage', () => {
    beforeEach(() => {
      tester = new KernelTester();
    });
    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });

    it('should be emitted for an unhandled message', async () => {
      const kernel = await tester.start();
      const msgId = UUID.uuid4();
      const emission = testEmission(kernel.unhandledMessage, {
        find: (k, msg) => msg.header.msg_id === msgId
      });
      const msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = { session: kernel.clientId };
      tester.send(msg);
      await emission;
    });

    it('should not be emitted for an iopub signal', async () => {
      const kernel = await tester.start();

      // We'll send two messages, first an iopub message, then a shell message.
      // The unhandledMessage signal should only emit once for the shell message.
      const msgId = UUID.uuid4();
      const emission = testEmission(kernel.unhandledMessage, {
        test: (k, msg) => {
          expect(msg.header.msg_id).to.equal(msgId);
        }
      });

      // Send an iopub message.
      tester.sendStatus(UUID.uuid4(), 'idle');

      // Send a shell message.
      const msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = { session: kernel.clientId };
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
          expect((msg.parent_header as KernelMessage.IHeader).session).to.equal(
            kernel.clientId
          );
          expect(msg.header.msg_id).to.equal(msgId);
        }
      });

      // Send a shell message with the wrong client (parent) session.
      const msg1 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: 'message from wrong session'
      });
      msg1.parent_header = { session: 'wrong session' };
      tester.send(msg1);

      // Send a shell message with the right client (parent) session.
      const msg2 = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: msgId
      });
      msg2.parent_header = { session: kernel.clientId };
      tester.send(msg2);

      await emission;
    });
  });

  describe('#anyMessage', () => {
    beforeEach(() => {
      tester = new KernelTester();
    });
    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });

    it('should be emitted for an unhandled message', async () => {
      const kernel = await tester.start();
      const msgId = UUID.uuid4();

      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect(args.msg.header.msg_id).to.equal(msgId);
          expect(args.msg.header.msg_type).to.equal('foo');
          expect(args.direction).to.equal('recv');
        }
      });

      const msg = KernelMessage.createShellMessage({
        msgType: 'foo',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId
      });
      msg.parent_header = { session: kernel.clientId };
      tester.send(msg);
      await emission;
    });

    it('should be emitted for an iopub message', async () => {
      const kernel = await tester.start();
      const msgId = 'idle status';

      // Wait for idle status

      const emission = testEmission(kernel.anyMessage, {
        find: (k, args) => args.direction === 'recv',
        test: (k, args) => {
          expect((args.msg.header as any).msg_id).to.equal(msgId);
          expect(args.direction).to.equal('recv');
        }
      });
      tester.sendStatus(msgId, 'idle');
      await emission;
    });

    it('should be emitted for an stdin message', async () => {
      const kernel = await tester.start();
      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect(args.msg.content.value).to.equal('foo');
          expect(args.direction).to.equal('send');
        }
      });
      kernel.sendInputReply({ value: 'foo' });
      await emission;
    });
  });

  describe('#id', () => {
    it('should be a string', async () => {
      const kernel = await Kernel.startNew();
      expect(typeof kernel.id).to.equal('string');
      await kernel.shutdown();
    });
  });

  describe('#name', () => {
    it('should be a string', async () => {
      const kernel = await Kernel.startNew();
      expect(typeof kernel.name).to.equal('string');
      await kernel.shutdown();
    });
  });

  describe('#model', () => {
    it('should be an IModel', async () => {
      const kernel = await Kernel.startNew();
      const model = kernel.model;
      expect(typeof model.name).to.equal('string');
      expect(typeof model.id).to.equal('string');
      await kernel.shutdown();
    });
  });

  describe('#username', () => {
    it('should be a string', async () => {
      const kernel = await Kernel.startNew();
      expect(typeof kernel.username).to.equal('string');
      await kernel.shutdown();
    });
  });

  describe('#serverSettings', () => {
    it('should be the server settings', async () => {
      const kernel = await Kernel.startNew();
      expect(kernel.serverSettings.baseUrl).to.equal(PageConfig.getBaseUrl());
      await kernel.shutdown();
    });
  });

  describe('#clientId', () => {
    it('should be a string', async () => {
      const kernel = await Kernel.startNew();
      expect(typeof kernel.clientId).to.equal('string');
      await kernel.shutdown();
    });
  });

  describe('#status', () => {
    it('should get an idle status', async () => {
      const kernel = await Kernel.startNew();
      const emission = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'idle'
      });
      await kernel.requestExecute({ code: 'a=1' }).done;
      await emission;
      await kernel.shutdown();
    });

    it.only('should get a restarting status', async () => {
      console.log('STARTING KERNEL');
      const kernel = await Kernel.startNew();
      console.log('EXECUTING');

      const content: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let future = kernel.requestExecute(content);
      await future.done;

      const emission = testEmission(kernel.statusChanged, {
        find: (kernel, status) => {
          console.log(status);
          return true;
        }
      });
      console.log('RESTARTING KERNEL');
      await kernel.restart();
      console.log('AWAITING RESTART STATUS');
      await emission;
      console.log('EXECUTING AGAIN');

      await kernel.requestExecute(content).done;

      console.log('SHUTTING DOWN KERNEL');
      await kernel.shutdown();
      console.log('DONE');
    });

    // TODO: is it better to explicitly start/stop the default kernel? It's the
    // same number of lines, and easier.
    it('should get a busy status', async () => {
      const kernel = await Kernel.startNew();
      const emission = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'busy'
      });
      await kernel.requestExecute({ code: 'a=1' }, true).done;
      await emission;
      await kernel.shutdown();
    });

    it('should get a reconnecting status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const emission = testEmission(kernel.connectionStatusChanged, {
        find: () => kernel.connectionStatus === 'connecting'
      });

      await tester.close();
      await emission;
      tester.dispose();
    });

    it('should get a dead status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      tester.dispose();
    });

    it('should not emit an invalid status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const emission = testEmission(kernel.statusChanged, {
        test: (k, status) => {
          expect(status).to.equal('busy');
          expect(kernel.status).to.equal('busy');
        }
      });

      // This invalid status is not emitted.
      tester.sendStatus(UUID.uuid4(), 'invalid-status' as Kernel.Status);

      // This valid status is emitted.
      tester.sendStatus(UUID.uuid4(), 'busy');

      await emission;
      tester.dispose();
    });
  });

  describe('#info', () => {
    it('should get the kernel info', async () => {
      const specs = await Kernel.getSpecs();
      const defaultSpecs = specs.kernelspecs[specs.default];

      const kernel = await Kernel.startNew();
      // Wait until the kernel says it is connected
      await testEmission(kernel.connectionStatusChanged, {
        find: (k, status) => status === 'connected'
      });
      const name = kernel.info.language_info.name;

      expect(name).to.equal(defaultSpecs.language);
      await kernel.shutdown();
    });
  });

  describe('#getSpec()', async () => {
    it('should resolve with the spec', async () => {
      const specs = await Kernel.getSpecs();
      const kernel = await Kernel.startNew();
      const spec = await kernel.getSpec();
      expect(spec.name).to.equal(specs.default);
      await kernel.shutdown();
    });
  });

  describe('#isDisposed', () => {
    let defaultKernel: Kernel.IKernel;
    beforeEach(async () => {
      defaultKernel = await Kernel.startNew();
    });
    afterEach(async () => {
      await defaultKernel.shutdown();
    });
    it('should be true after we dispose of the kernel', () => {
      const kernel = Kernel.connectTo(defaultKernel.model);
      expect(kernel.isDisposed).to.equal(false);
      kernel.dispose();
      expect(kernel.isDisposed).to.equal(true);
    });

    it('should be safe to call multiple times', () => {
      const kernel = Kernel.connectTo(defaultKernel.model);
      expect(kernel.isDisposed).to.equal(false);
      expect(kernel.isDisposed).to.equal(false);
      kernel.dispose();
      expect(kernel.isDisposed).to.equal(true);
      expect(kernel.isDisposed).to.equal(true);
    });
  });

  describe('#dispose()', () => {
    let defaultKernel: Kernel.IKernel;
    beforeEach(async () => {
      defaultKernel = await Kernel.startNew();
    });
    afterEach(async () => {
      await defaultKernel.shutdown();
    });
    it('should dispose of the resources held by the kernel', () => {
      const kernel = Kernel.connectTo(defaultKernel.model);
      const future = kernel.requestExecute({ code: 'foo' });
      expect(future.isDisposed).to.equal(false);
      kernel.dispose();
      expect(future.isDisposed).to.equal(true);
    });

    it('should be safe to call twice', () => {
      const kernel = Kernel.connectTo(defaultKernel.model);
      const future = kernel.requestExecute({ code: 'foo' });
      expect(future.isDisposed).to.equal(false);
      kernel.dispose();
      expect(future.isDisposed).to.equal(true);
      expect(kernel.isDisposed).to.equal(true);
      kernel.dispose();
      expect(future.isDisposed).to.equal(true);
      expect(kernel.isDisposed).to.equal(true);
    });
  });

  describe('#sendShellMessage()', () => {
    beforeEach(async () => {
      tester = new KernelTester();
    });
    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });
    it('should send a message to the kernel', async () => {
      const kernel = await tester.start();
      const done = new PromiseDelegate<void>();
      const msgId = UUID.uuid4();

      tester.onMessage(msg => {
        try {
          expect(msg.header.msg_id).to.equal(msgId);
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve(null);
      });

      const options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId
      };
      const msg = KernelMessage.createShellMessage(options);
      kernel.sendShellMessage(msg, true);
      await done;
    });

    it('should send a binary message', async () => {
      const kernel = await tester.start();
      const done = new PromiseDelegate<void>();
      const msgId = UUID.uuid4();

      tester.onMessage(msg => {
        try {
          const decoder = new TextDecoder('utf8');
          const item = msg.buffers[0] as DataView;
          expect(decoder.decode(item)).to.equal('hello');
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve(null);
      });

      const options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId
      };
      const encoder = new TextEncoder();
      const data = encoder.encode('hello');
      const msg = KernelMessage.createShellMessage(options, {}, {}, [
        data,
        data.buffer
      ]);
      kernel.sendShellMessage(msg, true);
      await done;
    });

    it('should fail if the kernel is dead', async () => {
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;

      const options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId
      };
      const msg = KernelMessage.createShellMessage(options);
      expect(() => {
        kernel.sendShellMessage(msg, true);
        expect(false).to.equal(true);
      }).to.throw(/Kernel is dead/);
    });

    it('should handle out of order messages', async () => {
      // This test that a future.done promise resolves when a status idle and
      // reply come through, even if the status comes first.
      const kernel = await tester.start();

      const options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId
      };
      const msg = KernelMessage.createShellMessage(options);
      const future = kernel.sendShellMessage(msg, true);

      let newMsg: KernelMessage.IMessage;
      tester.onMessage(msg => {
        // trigger onDone
        options.msgType = 'status';
        options.channel = 'iopub';
        newMsg = KernelMessage.createMessage(options, {
          execution_state: 'idle'
        });
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
    });
  });

  describe('#interrupt()', () => {
    it('should interrupt and resolve with a valid server response', async () => {
      const kernel = await Kernel.startNew();
      await kernel.interrupt();
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 200, {
        id: kernel.id,
        name: kernel.name
      });
      const interrupt = kernel.interrupt();
      await expectFailure(interrupt, 'Invalid response: 200 OK');
      await kernel.shutdown();
    });

    it('should throw an error for an error response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 500, {});
      const interrupt = kernel.interrupt();
      await expectFailure(interrupt, '');
      await kernel.shutdown();
    });

    it('should fail if the kernel is dead', async () => {
      tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      await expectFailure(kernel.interrupt(), 'Kernel is dead');
      await tester.shutdown();
      tester.dispose();
    });
  });

  describe('#restart()', () => {
    // TODO: seems to be sporadically timing out if we await the restart. See
    // https://github.com/jupyter/notebook/issues/3705.
    it('should restart and resolve with a valid server response', async () => {
      const kernel = await Kernel.startNew();
      await kernel.restart();
      await kernel.shutdown();
    });

    it('should fail if the kernel does not restart', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 500, {});
      const restart = kernel.restart();
      await expectFailure(restart, '');
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 205, {
        id: kernel.id,
        name: kernel.name
      });
      await expectFailure(
        kernel.restart(),
        'Invalid response: 205 Reset Content'
      );
      await kernel.shutdown();
    });

    it('should throw an error for an error response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 500, {});
      const restart = kernel.restart();
      await expectFailure(restart);
      await kernel.shutdown();
    });

    it('should throw an error for an invalid id', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 200, {});
      const restart = kernel.restart();
      await expectFailure(restart);
      await kernel.shutdown();
    });

    it('should dispose of existing comm and future objects', async () => {
      const kernel = await Kernel.startNew();
      const comm = kernel.connectToComm('test');
      const future = kernel.requestExecute({ code: 'foo' });
      await kernel.restart();
      // Wait until the kernel says it is restarted
      await testEmission(kernel.statusChanged, {
        find: (k, status) => status === 'restarting'
      });
      expect(future.isDisposed).to.equal(true);
      expect(comm.isDisposed).to.equal(true);
      await kernel.shutdown();
    });
  });

  describe('#reconnect()', () => {
    it('should reconnect the websocket', async () => {
      const kernel = await Kernel.startNew();
      await kernel.reconnect();
      await kernel.shutdown();
    });

    // it('should emit `"reconnecting"`, then `"connected"` status', async () => {
    //   const kernel = await Kernel.startNew();
    //   let connectedEmission: Promise<void>;
    //   const emission = testEmission(kernel.statusChanged, {
    //     find: () => kernel.status === 'reconnecting',
    //     test: () => {
    //       connectedEmission = testEmission(kernel.statusChanged, {
    //         find: () => kernel.status === 'connected'
    //       });
    //     }
    //   });

    //   await kernel.reconnect();
    //   await emission;
    //   await connectedEmission;
    //   await kernel.shutdown();
    // });
  });

  describe('#shutdown()', () => {
    it('should shut down and resolve with a valid server response', async () => {
      const kernel = await Kernel.startNew();
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 200, {
        id: UUID.uuid4(),
        name: 'foo'
      });
      const shutdown = kernel.shutdown();
      await expectFailure(shutdown, 'Invalid response: 200 OK');
      await kernel.shutdown();
    });

    it('should handle a 404 error', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 404, {});
      // silently ignores a 404 error
      await kernel.shutdown();
      // shut down kernel for real
      await kernel.shutdown();
    });

    it('should throw an error for an error response', async () => {
      const kernel = await Kernel.startNew();
      handleRequest(kernel, 500, {});
      const shutdown = kernel.shutdown();
      await expectFailure(shutdown, '');
      await kernel.shutdown();
    });

    it('should still pass if the kernel is dead', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      await kernel.shutdown();
      tester.dispose();
    });

    it('should dispose of all kernel instances', async () => {
      const kernel0 = await Kernel.startNew();
      const kernel1 = Kernel.connectTo(kernel0.model);
      await kernel0.shutdown();
      expect(kernel0.isDisposed).to.equal(true);
      expect(kernel1.isDisposed).to.equal(true);
    });
  });

  describe('#requestKernelInfo()', () => {
    it('should resolve the promise', async () => {
      const kernel = await Kernel.startNew();
      // Wait until the kernel says it is connected
      await testEmission(kernel.connectionStatusChanged, {
        find: (k, status) => status === 'connected'
      });

      const msg = await kernel.requestKernelInfo();
      const name = msg.content.language_info.name;
      expect(name).to.be.ok;
      await kernel.shutdown();
    });
  });

  describe('#requestComplete()', () => {
    it('should resolve the promise', async () => {
      const kernel = await Kernel.startNew();
      const options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      await kernel.requestComplete(options);
      await kernel.shutdown();
    });

    it('should reject the promise if the kernel is dead', async () => {
      const options: KernelMessage.ICompleteRequest = {
        code: 'hello',
        cursor_pos: 4
      };
      const tester = new KernelTester();
      const kernel = await tester.start();

      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      await expectFailure(kernel.requestComplete(options), 'Kernel is dead');
      tester.dispose();
    });
  });

  describe('#requestInspect()', () => {
    it('should resolve the promise', async () => {
      const kernel = await Kernel.startNew();
      const options: KernelMessage.IInspectRequest = {
        code: 'hello',
        cursor_pos: 4,
        detail_level: 0
      };
      await kernel.requestInspect(options);
      await kernel.shutdown();
    });
  });

  describe('#requestIsComplete()', () => {
    it('should resolve the promise', async () => {
      const kernel = await Kernel.startNew();
      const options: KernelMessage.IIsCompleteRequest = {
        code: 'hello'
      };
      await kernel.requestIsComplete(options);
      await kernel.shutdown();
    });
  });

  describe('#requestHistory()', () => {
    it('should resolve the promise', async () => {
      const kernel = await Kernel.startNew();
      const options: KernelMessage.IHistoryRequest = {
        output: true,
        raw: true,
        hist_access_type: 'search',
        session: 0,
        start: 1,
        stop: 2,
        n: 1,
        pattern: '*',
        unique: true
      };
      await kernel.requestHistory(options);
      await kernel.shutdown();
    });
  });

  describe('#sendInputReply()', () => {
    it('should send an input_reply message', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const done = new PromiseDelegate<void>();
      tester.onMessage(msg => {
        expect(msg.header.msg_type).to.equal('input_reply');
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
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      expect(() => {
        kernel.sendInputReply({ value: 'test' });
      }).to.throw(/Kernel is dead/);
      tester.dispose();
    });
  });

  describe('#requestExecute()', () => {
    it('should send and handle incoming messages', async () => {
      let newMsg: KernelMessage.IMessage;
      const content: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };

      const options: KernelMessage.IOptions = {
        msgType: 'custom',
        channel: 'shell',
        username: 'username',
        session: 'client-id'
      };

      let future: Kernel.IFuture;
      const tester = new KernelTester();

      tester.onMessage(msg => {
        expect(msg.channel).to.equal('shell');

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
          const streamContent: JSONObject = { name: 'stdout', text: '' };
          newMsg = KernelMessage.createMessage(options, streamContent);
          newMsg.parent_header = msg.header;
          tester.send(newMsg);
        };

        future.onIOPub = ioMsg => {
          if (ioMsg.header.msg_type === 'stream') {
            // trigger onDone
            options.msgType = 'status';
            newMsg = KernelMessage.createMessage(options, {
              execution_state: 'idle'
            });
            newMsg.parent_header = msg.header;
            tester.send(newMsg);
          }
        };
      });

      const kernel = await tester.start();
      future = kernel.requestExecute(content);
      await future.done;
      expect(future.isDisposed).to.equal(true);
      await tester.shutdown();
      tester.dispose();
    });

    it('should not dispose of KernelFuture when disposeOnDone=false', async () => {
      const kernel = await Kernel.startNew();
      const options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const future = kernel.requestExecute(options, false);
      await future.done;
      expect(future.isDisposed).to.equal(false);
      future.dispose();
      expect(future.isDisposed).to.equal(true);
      await kernel.shutdown();
    });
  });

  describe('#checkExecuteMetadata()', () => {
    it('should accept cell metadata as part of request', async () => {
      const kernel = await Kernel.startNew();
      let options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      let metadata = { cellId: 'test' };
      let future = kernel.requestExecute(options, false, metadata);
      await future.done;
      expect((future.msg.metadata = metadata));
      await kernel.shutdown();
    });
  });

  describe('#registerMessageHook()', () => {
    it('should have the most recently registered hook run first', async () => {
      const options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      let future: Kernel.IFuture;

      let kernel: Kernel.IKernel;

      const tester = new KernelTester();
      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          const msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { name: 'stdout', text: 'foo' };
          tester.send(msgStream);
          // trigger onDone
          const msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state =
            'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, async msg => {
          // Make this hook call asynchronous
          await calls.push('last');
          return true;
        });

        kernel.registerMessageHook(parentHeader.msg_id, msg => {
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
      expect(calls).to.deep.equal([
        'first',
        'last',
        'iopub',
        'first',
        'last',
        'iopub'
      ]);
      await tester.shutdown();
      tester.dispose();
    });

    it('should abort processing if a hook returns false, but the done logic should still work', async () => {
      const options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];

      const tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          const msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { name: 'stdout', text: 'foo' };
          tester.send(msgStream);
          // trigger onDone
          const msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state =
            'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, msg => {
          calls.push('last');
          return true;
        });

        kernel.registerMessageHook(parentHeader.msg_id, msg => {
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
      expect(calls).to.deep.equal(['first', 'first']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should process additions on the next run', async () => {
      const options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      const tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          const msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { name: 'stdout', text: 'foo' };
          tester.send(msgStream);
          // trigger onDone
          const msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state =
            'idle';
          tester.send(msgDone);
        };

        kernel.registerMessageHook(parentHeader.msg_id, msg => {
          calls.push('last');
          kernel.registerMessageHook(parentHeader.msg_id, msg => {
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
      expect(calls).to.deep.equal(['last', 'iopub', 'first', 'last', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should deactivate a hook immediately on removal', async () => {
      const options: KernelMessage.IExecuteRequest = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      const tester = new KernelTester();
      let future: Kernel.IFuture;
      let kernel: Kernel.IKernel;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const msg = createMsg('shell', parentHeader);
        tester.send(msg);

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          const msgStream = createMsg('iopub', parentHeader);
          msgStream.header.msg_type = 'stream';
          msgStream.content = { name: 'stdout', text: 'foo' };
          tester.send(msgStream);
          // trigger onDone
          const msgDone = createMsg('iopub', parentHeader);
          msgDone.header.msg_type = 'status';
          (msgDone as KernelMessage.IStatusMsg).content.execution_state =
            'idle';
          tester.send(msgDone);
        };

        const toDelete = (msg: KernelMessage.IIOPubMessage) => {
          calls.push('delete');
          return true;
        };
        kernel.registerMessageHook(parentHeader.msg_id, toDelete);
        kernel.registerMessageHook(parentHeader.msg_id, msg => {
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
      expect(calls).to.deep.equal([
        'first',
        'delete',
        'iopub',
        'first',
        'iopub'
      ]);
      await tester.shutdown();
      tester.dispose();
    });
  });

  describe('handles messages asynchronously', () => {
    // TODO: Also check that messages are canceled appropriately. In particular, when
    // a kernel is restarted, then a message is sent for a comm open from the
    // old session, the comm open should be canceled.

    it('should run handlers in order', async () => {
      const options: KernelMessage.IExecuteRequest = {
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

      const anyMessageDone = new PromiseDelegate();
      const handlingBlock = new PromiseDelegate();

      tester.onMessage(message => {
        tester.onMessage(() => {
          return;
        });
        tester.parentHeader = message.header;

        pushIopub(tester.sendStatus('busy', 'busy'));
        pushIopub(tester.sendStream('stdout', { name: 'stdout', text: 'foo' }));
        pushCommOpen(
          tester.sendCommOpen('comm open', {
            target_name: 'commtarget',
            comm_id: 'commid',
            data: {}
          })
        );
        pushIopub(
          tester.sendDisplayData('display 1', { data: {}, metadata: {} })
        );
        pushCommMsg(
          tester.sendCommMsg('comm 1', { comm_id: 'commid', data: {} })
        );
        pushCommMsg(
          tester.sendCommMsg('comm 2', { comm_id: 'commid', data: {} })
        );
        pushCommClose(
          tester.sendCommClose('comm close', { comm_id: 'commid', data: {} })
        );
        pushStdin(
          tester.sendInputRequest('stdin', { prompt: '', password: false })
        );
        pushIopub(
          tester.sendDisplayData('display 2', {
            data: {},
            metadata: {},
            transient: { display_id: 'displayid' }
          })
        );
        pushIopub(
          tester.sendUpdateDisplayData('update display', {
            data: {},
            metadata: {},
            transient: { display_id: 'displayid' }
          })
        );
        pushIopub(
          tester.sendExecuteResult('execute result', {
            execution_count: 1,
            data: {},
            metadata: {}
          })
        );
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

      kernel.registerMessageHook(future.msg.header.msg_id, async msg => {
        // Make this hook call asynchronous
        await calls.push([msg.header.msg_id, 'kernel hook b']);
        return true;
      });

      kernel.registerMessageHook(future.msg.header.msg_id, async msg => {
        calls.push([msg.header.msg_id, 'kernel hook a']);
        return true;
      });

      kernel.registerCommTarget('commtarget', async (comm, msg) => {
        await calls.push([msg.header.msg_id, 'comm open']);

        comm.onMsg = async msg => {
          await calls.push([msg.header.msg_id, 'comm msg']);
        };
        comm.onClose = async msg => {
          await calls.push([msg.header.msg_id, 'comm close']);
        };
      });

      future.registerMessageHook(async msg => {
        await calls.push([msg.header.msg_id, 'future hook b']);
        return true;
      });

      future.registerMessageHook(async msg => {
        // Delay processing until after we've checked the anyMessage results.
        await handlingBlock.promise;
        await calls.push([msg.header.msg_id, 'future hook a']);
        return true;
      });

      future.onIOPub = async msg => {
        await calls.push([msg.header.msg_id, 'iopub']);
      };

      future.onStdin = async msg => {
        await calls.push([msg.header.msg_id, 'stdin']);
      };

      future.onReply = async msg => {
        await calls.push([msg.header.msg_id, 'reply']);
      };

      // Give the kernel time to receive and queue up the messages.
      await anyMessageDone.promise;

      // At this point, the synchronous anyMessage signal should have been
      // emitted for every message, but no actual message handling should have
      // happened.
      expect(msgSignal).to.deep.equal(msgSignalExpected);
      expect(calls).to.deep.equal([]);

      // Release the lock on message processing.
      handlingBlock.resolve(undefined);
      await future.done;
      expect(calls).to.deep.equal(callsExpected);

      await tester.shutdown();
      tester.dispose();
    });
  });
});
