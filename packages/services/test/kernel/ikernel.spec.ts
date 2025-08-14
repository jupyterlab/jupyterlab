// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { JupyterServer, testEmission } from '@jupyterlab/testing';
import { PromiseDelegate, UUID } from '@lumino/coreutils';
import {
  Kernel,
  KernelManager,
  KernelMessage,
  KernelSpec,
  KernelSpecAPI
} from '../../src';
import { FakeKernelManager, handleRequest, KernelTester } from '../utils';

describe('Kernel.IKernel', () => {
  let defaultKernel: Kernel.IKernelConnection;
  let specs: KernelSpec.ISpecModels;
  let kernelManager: KernelManager;
  let server: JupyterServer;

  jest.retryTimes(3);

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
    kernelManager = new FakeKernelManager();
    specs = await KernelSpecAPI.getSpecs();
  }, 30000);

  beforeEach(async () => {
    defaultKernel = await kernelManager.startNew();
    await defaultKernel.info;
  });

  afterEach(async () => {
    await defaultKernel.shutdown();
    defaultKernel.dispose();
  });

  afterAll(async () => {
    await kernelManager.shutdownAll();
    await server.shutdown();
  });

  describe('#disposed', () => {
    it('should be emitted when the kernel is disposed', async () => {
      await defaultKernel.info;
      let called = false;
      defaultKernel.disposed.connect((sender, args) => {
        expect(sender).toBe(defaultKernel);
        expect(args).toBeUndefined();
        called = true;
      });
      defaultKernel.dispose();
      expect(called).toBe(true);
    });

    it('should be emitted when the kernel is shut down', async () => {
      await defaultKernel.info;
      let called = false;
      defaultKernel.disposed.connect((sender, args) => {
        expect(sender).toBe(defaultKernel);
        expect(args).toBeUndefined();
        called = true;
      });
      await defaultKernel.shutdown();
      expect(called).toBe(true);
    });
  });

  describe('#statusChanged', () => {
    it('should be a signal following the Kernel status', async () => {
      let called = false;
      defaultKernel.statusChanged.connect(() => {
        if (defaultKernel.status === 'busy') {
          called = true;
        }
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).toBe(true);
    });
  });

  describe('#pendingInput', () => {
    it('should be a signal following input request', async () => {
      let called = false;
      defaultKernel.pendingInput.connect((sender, args) => {
        if (!called) {
          called = true;
          defaultKernel.sendInputReply(
            { status: 'ok', value: 'foo' },
            {
              date: '',
              msg_id: '',
              msg_type: 'input_request',
              session: '',
              username: '',
              version: ''
            }
          );
        }
      });
      const code = `input("Input something")`;
      await defaultKernel.requestExecute(
        {
          code: code,
          allow_stdin: true
        },
        true
      ).done;
      expect(called).toBe(true);
    });
  });

  describe('#iopubMessage', () => {
    it('should be emitted for an iopub message', async () => {
      let called = false;
      defaultKernel.iopubMessage.connect((k, msg) => {
        called = true;
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      expect(called).toBe(true);
    });

    it('should be emitted regardless of the sender', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const msgId = UUID.uuid4();
      const emission = testEmission(kernel.iopubMessage, {
        find: (k, msg) => msg.header.msg_id === msgId
      });
      const msg = KernelMessage.createMessage({
        msgType: 'status',
        channel: 'iopub',
        session: tester.serverSessionId,
        msgId,
        content: {
          execution_state: 'idle'
        }
      });
      tester.send(msg);
      await emission;
      await expect(tester.shutdown()).resolves.not.toThrow();
      tester.dispose();
    });
  });

  describe('#unhandledMessage', () => {
    let tester: KernelTester;
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
      const msg = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId,
        content: {}
      });
      msg.parent_header = { session: kernel.clientId } as any;
      tester.send(msg);
      await expect(emission).resolves.not.toThrow();
    });

    it('should not be emitted for an iopub signal', async () => {
      const kernel = await tester.start();

      // We'll send two messages, first an iopub message, then a shell message.
      // The unhandledMessage signal should only emit once for the shell message.
      const msgId = UUID.uuid4();
      const emission = testEmission(kernel.unhandledMessage, {
        test: (k, msg) => {
          expect(msg.header.msg_id).toBe(msgId);
        }
      });

      // Send an iopub message.
      tester.sendStatus(UUID.uuid4(), 'idle');

      // Send a shell message.
      const msg = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId,
        content: {}
      });
      msg.parent_header = { session: kernel.clientId } as any;
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
          expect((msg.parent_header as KernelMessage.IHeader).session).toBe(
            kernel.clientId
          );
          expect(msg.header.msg_id).toBe(msgId);
        }
      });

      // Send a shell message with the wrong client (parent) session.
      const msg1 = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: 'message from wrong session',
        content: {}
      });
      msg1.parent_header = { session: 'wrong session' } as any;
      tester.send(msg1);

      // Send a shell message with the right client (parent) session.
      const msg2 = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId: msgId,
        content: {}
      });
      msg2.parent_header = { session: kernel.clientId } as any;
      tester.send(msg2);

      await emission;
    });
  });

  describe('#anyMessage', () => {
    let tester: KernelTester;
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
          expect(args.msg.header.msg_id).toBe(msgId);
          expect(args.msg.header.msg_type).toBe('kernel_info_request');
          expect(args.direction).toBe('recv');
        }
      });

      const msg = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        session: tester.serverSessionId,
        msgId,
        content: {}
      });
      msg.parent_header = { session: kernel.clientId } as any;
      tester.send(msg);
      await emission;
    });

    it('should be emitted for an iopub message', async () => {
      const kernel = await tester.start();
      const msgId = 'idle status';

      const emission = testEmission(kernel.anyMessage, {
        test: (k, args) => {
          expect((args.msg.header as any).msg_id).toBe(msgId);
          expect(args.direction).toBe('recv');
        }
      });
      tester.sendStatus(msgId, 'idle');
      await emission;
    });

    it('should be emitted for an stdin message', async () => {
      const kernel = await tester.start();
      const emission = testEmission(kernel.anyMessage, {
        test: (k, { msg, direction }) => {
          if (!KernelMessage.isInputReplyMsg(msg)) {
            throw new Error('Unexpected message');
          }
          if (msg.content.status !== 'ok') {
            throw new Error('Message has been changed');
          }
          expect(msg.content.value).toBe('foo');
          expect(direction).toBe('send');
        }
      });
      kernel.sendInputReply(
        { status: 'ok', value: 'foo' },
        {
          date: '',
          msg_id: '',
          msg_type: 'input_request',
          session: '',
          username: '',
          version: ''
        }
      );
      await emission;
    });
  });

  describe('#id', () => {
    it('should be a string', () => {
      expect(typeof defaultKernel.id).toBe('string');
    });
  });

  describe('#name', () => {
    it('should be a string', () => {
      expect(typeof defaultKernel.name).toBe('string');
    });
  });

  describe('#username', () => {
    it('should be a string', () => {
      expect(typeof defaultKernel.username).toBe('string');
    });
  });

  describe('#serverSettings', () => {
    it('should be the server settings', () => {
      expect(defaultKernel.serverSettings.baseUrl).toBe(
        PageConfig.getBaseUrl()
      );
    });
  });

  describe('#clientId', () => {
    it('should be a string', () => {
      expect(typeof defaultKernel.clientId).toBe('string');
    });
  });

  describe('#status', () => {
    beforeEach(async () => {
      await defaultKernel.info;
    });

    it('should get an idle status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'idle'
      });
      await defaultKernel.requestExecute({ code: 'a=1' }).done;
      await expect(emission).resolves.not.toThrow();
    });

    it('should get a restarting status', async () => {
      const kernel = await kernelManager.startNew();
      await kernel.info;
      const emission = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'restarting'
      });
      await kernel.requestKernelInfo();
      await kernel.restart();
      await expect(emission).resolves.not.toThrow();
      await kernel.requestKernelInfo();
      await kernel.shutdown();
    }, 30000);

    it('should get a busy status', async () => {
      const emission = testEmission(defaultKernel.statusChanged, {
        find: () => defaultKernel.status === 'busy'
      });
      await defaultKernel.requestExecute({ code: 'a=1' }, true).done;
      await expect(emission).resolves.not.toThrow();
    });

    it('should get an unknown status while disconnected', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const emission = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'unknown'
      });

      await tester.close();
      await expect(emission).resolves.not.toThrow();
      tester.dispose();
    });

    it('should get a dead status', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      await kernel.info;
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await expect(dead).resolves.not.toThrow();
      tester.dispose();
    });
  });

  describe('#info', () => {
    it('should get the kernel info', async () => {
      const name = (await defaultKernel.info).language_info.name;
      const defaultSpecs = specs.kernelspecs[specs.default]!;
      expect(name).toBe(defaultSpecs.language);
    });
  });

  describe('#spec', () => {
    it('should resolve with the spec', async () => {
      const spec = await defaultKernel.spec;
      expect(spec!.name).toBe(specs.default);
    });
  });

  describe('#isDisposed', () => {
    it('should be true after we dispose of the kernel', async () => {
      const kernel = defaultKernel.clone();
      expect(kernel.isDisposed).toBe(false);
      kernel.dispose();
      expect(kernel.isDisposed).toBe(true);
    });

    it('should be safe to call multiple times', async () => {
      const kernel = defaultKernel.clone();
      expect(kernel.isDisposed).toBe(false);
      expect(kernel.isDisposed).toBe(false);
      kernel.dispose();
      expect(kernel.isDisposed).toBe(true);
      expect(kernel.isDisposed).toBe(true);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources held by the kernel', async () => {
      const kernel = defaultKernel.clone();
      const future = kernel.requestExecute({ code: 'foo' });
      expect(future.isDisposed).toBe(false);
      kernel.dispose();
      expect(future.isDisposed).toBe(true);
    });

    it('should be safe to call twice', async () => {
      const kernel = defaultKernel.clone();
      const future = kernel.requestExecute({ code: 'foo' });
      expect(future.isDisposed).toBe(false);
      kernel.dispose();
      expect(future.isDisposed).toBe(true);
      expect(kernel.isDisposed).toBe(true);
      kernel.dispose();
      expect(future.isDisposed).toBe(true);
      expect(kernel.isDisposed).toBe(true);
    });
  });

  describe('#sendShellMessage()', () => {
    let tester: KernelTester;
    let kernel: Kernel.IKernelConnection;

    beforeEach(async () => {
      tester = new KernelTester();
      kernel = await tester.start();
    });

    afterEach(async () => {
      await tester.shutdown();
      tester.dispose();
    });

    it('should send a message to the kernel', async () => {
      const done = new PromiseDelegate<void>();
      const msgId = UUID.uuid4();

      tester.onMessage(msg => {
        try {
          expect(msg.header.msg_id).toBe(msgId);
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve();
      });

      const msg = KernelMessage.createMessage({
        msgType: 'comm_info_request',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId,
        content: {}
      });
      kernel.sendShellMessage(msg, true);
      await done.promise;
    });

    it('should send a binary message', async () => {
      const done = new PromiseDelegate<void>();
      const msgId = UUID.uuid4();

      tester.onMessage(msg => {
        try {
          const decoder = new TextDecoder('utf8');
          const item = msg.buffers![0] as DataView;
          expect(decoder.decode(item)).toBe('hello');
        } catch (e) {
          done.reject(e);
          throw e;
        }
        done.resolve();
      });

      const encoder = new TextEncoder();
      const data = encoder.encode('hello');
      const msg = KernelMessage.createMessage({
        msgType: 'comm_info_request',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        msgId,
        content: {},
        buffers: [data, data.buffer]
      });
      kernel.sendShellMessage(msg, true);
      await done.promise;
    });

    it('should fail if the kernel is dead', async () => {
      // Create a promise that resolves when the kernel's status changes to dead
      const dead = testEmission(kernel.statusChanged, {
        find: () => kernel.status === 'dead'
      });
      tester.sendStatus(UUID.uuid4(), 'dead');
      await dead;
      expect(kernel.status).toBe('dead');

      const msg = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        content: {}
      });
      expect(() => {
        kernel.sendShellMessage(msg, true);
      }).toThrow(/Kernel is dead/);
    });

    it('should handle out of order messages', async () => {
      // This test that a future.done promise resolves when a status idle and
      // reply come through, even if the status comes first.

      const msg = KernelMessage.createMessage({
        msgType: 'kernel_info_request',
        channel: 'shell',
        username: kernel.username,
        session: kernel.clientId,
        content: {}
      });
      const future = kernel.sendShellMessage(msg, true);

      tester.onMessage(msg => {
        // trigger onDone
        tester.send(
          KernelMessage.createMessage({
            msgType: 'status',
            channel: 'iopub',
            username: kernel.username,
            session: kernel.clientId,
            content: { execution_state: 'idle' },
            parentHeader: msg.header
          })
        );

        future.onIOPub = () => {
          tester.send(
            KernelMessage.createMessage({
              msgType: 'comm_open',
              channel: 'shell',
              username: kernel.username,
              session: kernel.clientId,
              content: {
                comm_id: 'abcd',
                target_name: 'target',
                data: {}
              },
              parentHeader: msg.header
            })
          );
        };
      });
      await expect(future.done).resolves.not.toThrow();
    });
  });

  describe('#interrupt()', () => {
    it('should interrupt and resolve with a valid server response', async () => {
      const kernel = await kernelManager.startNew();
      await expect(kernel.interrupt()).resolves.not.toThrow();
      await kernel.shutdown();
    });

    it('should throw an error for an invalid response', async () => {
      handleRequest(defaultKernel, 200, {
        id: defaultKernel.id,
        name: defaultKernel.name
      });
      const interrupt = defaultKernel.interrupt();
      await expect(interrupt).rejects.toThrow(/Invalid response: 200/);
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, {});
      const interrupt = defaultKernel.interrupt();
      await expect(interrupt).rejects.toThrow();
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
      await expect(kernel.interrupt()).rejects.toThrow(/Kernel is dead/);
      tester.dispose();
    });
  });

  describe('#restart()', () => {
    beforeEach(async () => {
      await defaultKernel.requestKernelInfo();
    });

    it('should restart and resolve with a valid server response', async () => {
      const kernel = await kernelManager.startNew();
      await kernel.info;
      await kernel.requestKernelInfo();
      await kernel.restart();
      await expect(kernel.requestKernelInfo()).resolves.not.toThrow();
      await kernel.shutdown();
    });

    it('should fail if the kernel does not restart', async () => {
      handleRequest(defaultKernel, 500, {});
      const restart = defaultKernel.restart();
      await expect(restart).rejects.toThrow();
    });

    it('should throw an error for an invalid response', async () => {
      const { id, name } = defaultKernel;
      handleRequest(defaultKernel, 205, { id, name });
      await expect(defaultKernel.restart()).rejects.toThrow(
        /Invalid response: 205/
      );
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, {});
      const restart = defaultKernel.restart();
      await expect(restart).rejects.toThrow();
    });

    it('should throw an error for an invalid id', async () => {
      handleRequest(defaultKernel, 200, {});
      const restart = defaultKernel.restart();
      await expect(restart).rejects.toThrow();
    });

    it('should dispose of existing comm and future objects', async () => {
      const kernel = await kernelManager.startNew();
      await kernel.info;
      await kernel.requestKernelInfo();
      const comm = kernel.createComm('test');
      const future = kernel.requestExecute({ code: 'foo' });
      await kernel.restart();
      await kernel.requestKernelInfo();
      expect(future.isDisposed).toBe(true);
      expect(comm.isDisposed).toBe(true);
      await kernel.shutdown();
    });
  });

  describe('#reconnect()', () => {
    it('should create a new websocket and resolve the returned promise', async () => {
      const oldWS = (defaultKernel as any)._ws;
      await defaultKernel.reconnect();
      expect((defaultKernel as any)._ws).not.toBe(oldWS);
    });

    it('should emit `"connecting"`, then `"connected"` status', async () => {
      const emission = testEmission(defaultKernel.connectionStatusChanged, {
        find: () => defaultKernel.connectionStatus === 'connecting',
        test: async () => {
          await testEmission(defaultKernel.connectionStatusChanged, {
            find: () => defaultKernel.connectionStatus === 'connected'
          });
        }
      });
      await defaultKernel.reconnect();
      await expect(emission).resolves.not.toThrow();
    });

    it('return promise should reject if the kernel is disposed or disconnected', async () => {
      const connection = defaultKernel.reconnect();
      defaultKernel.dispose();
      await expect(connection).rejects.toThrow();
    });
  });

  describe('#shutdown()', () => {
    it('should shut down and resolve with a valid server response', async () => {
      const kernel = await kernelManager.startNew();
      await expect(kernel.shutdown()).resolves.not.toThrow();
    });

    it('should throw an error for an invalid response', async () => {
      handleRequest(defaultKernel, 200, {
        id: UUID.uuid4(),
        name: 'foo'
      });
      const shutdown = defaultKernel.shutdown();
      await expect(shutdown).rejects.toThrow(/Invalid response: 200/);
    });

    it('should handle a 404 error', async () => {
      const kernel = await kernelManager.startNew();
      handleRequest(kernel, 404, {});
      await expect(kernel.shutdown()).resolves.not.toThrow();
    });

    it('should throw an error for an error response', async () => {
      handleRequest(defaultKernel, 500, {});
      const shutdown = defaultKernel.shutdown();
      await expect(shutdown).rejects.toThrow();
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
      await expect(kernel.shutdown()).resolves.not.toThrow();
      tester.dispose();
    });
  });

  describe('#requestKernelInfo()', () => {
    it('should resolve the promise', async () => {
      const msg = (await defaultKernel.requestKernelInfo())!;
      if (msg.content.status !== 'ok') {
        throw new Error('Message error');
      }
      const name = msg.content.language_info.name;
      expect(name).toBeTruthy();
    });
  });

  describe('#requestComplete()', () => {
    it('should resolve the promise', async () => {
      const options: KernelMessage.ICompleteRequestMsg['content'] = {
        code: 'hello',
        cursor_pos: 4
      };
      await expect(
        defaultKernel.requestComplete(options)
      ).resolves.not.toThrow();
    });

    it('should reject the promise if the kernel is dead', async () => {
      const options: KernelMessage.ICompleteRequestMsg['content'] = {
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
      await expect(kernel.requestComplete(options)).rejects.toThrow(
        /Kernel is dead/
      );
      tester.dispose();
    });
  });

  describe('#requestInspect()', () => {
    it('should resolve the promise', async () => {
      const options: KernelMessage.IInspectRequestMsg['content'] = {
        code: 'hello',
        cursor_pos: 4,
        detail_level: 0
      };
      await expect(
        defaultKernel.requestInspect(options)
      ).resolves.not.toThrow();
    });
  });

  describe('#requestIsComplete()', () => {
    it('should resolve the promise', async () => {
      const options: KernelMessage.IIsCompleteRequestMsg['content'] = {
        code: 'hello'
      };
      await expect(
        defaultKernel.requestIsComplete(options)
      ).resolves.not.toThrow();
    });
  });

  describe('#requestHistory()', () => {
    it('range messages should resolve the promise', async () => {
      const options: KernelMessage.IHistoryRequestMsg['content'] = {
        output: true,
        raw: true,
        hist_access_type: 'range',
        session: 0,
        start: 1,
        stop: 2
      };
      await expect(
        defaultKernel.requestHistory(options)
      ).resolves.not.toThrow();
    });

    it('tail messages should resolve the promise', async () => {
      const options: KernelMessage.IHistoryRequestMsg['content'] = {
        output: true,
        raw: true,
        hist_access_type: 'tail',
        n: 1
      };
      await expect(
        defaultKernel.requestHistory(options)
      ).resolves.not.toThrow();
    });

    it('search messages should resolve the promise', async () => {
      const options: KernelMessage.IHistoryRequestMsg['content'] = {
        output: true,
        raw: true,
        hist_access_type: 'search',
        n: 1,
        pattern: '*',
        unique: true
      };
      await expect(
        defaultKernel.requestHistory(options)
      ).resolves.not.toThrow();
    });
  });

  describe('#sendInputReply()', () => {
    it('should send an input_reply message', async () => {
      const tester = new KernelTester();
      const kernel = await tester.start();
      const done = new PromiseDelegate<void>();
      tester.onMessage(msg => {
        expect(msg.header.msg_type).toBe('input_reply');
        done.resolve(undefined);
      });
      kernel.sendInputReply(
        { status: 'ok', value: 'test' },
        {
          date: '',
          msg_id: '',
          msg_type: 'input_request',
          session: '',
          username: '',
          version: ''
        }
      );
      await done.promise;
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
        kernel.sendInputReply(
          { status: 'ok', value: 'test' },
          {
            date: '',
            msg_id: '',
            msg_type: 'input_request',
            session: '',
            username: '',
            version: ''
          }
        );
      }).toThrow(/Kernel is dead/);
      tester.dispose();
    });
  });

  describe('#requestExecute()', () => {
    it('should send and handle incoming messages', async () => {
      const content: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };

      const options = {
        username: defaultKernel.username,
        session: defaultKernel.clientId
      };

      let future: Kernel.IShellFuture;
      const tester = new KernelTester();

      tester.onMessage(msg => {
        expect(msg.channel).toBe('shell');

        // send a reply
        tester.send(
          KernelMessage.createMessage<KernelMessage.IExecuteReplyMsg>({
            ...options,
            msgType: 'execute_reply',
            channel: 'shell',
            content: {
              execution_count: 1,
              status: 'ok',
              user_expressions: {}
            },
            parentHeader:
              msg.header as KernelMessage.IExecuteRequestMsg['header']
          })
        );

        future.onReply = () => {
          // trigger onStdin
          tester.send(
            KernelMessage.createMessage({
              ...options,
              channel: 'stdin',
              msgType: 'input_request',
              content: {
                prompt: 'prompt',
                password: false
              },
              parentHeader: msg.header
            })
          );
        };

        future.onStdin = () => {
          // trigger onIOPub with a 'stream' message
          tester.send(
            KernelMessage.createMessage<KernelMessage.IStreamMsg>({
              ...options,
              channel: 'iopub',
              msgType: 'stream',
              content: { name: 'stdout', text: '' },
              parentHeader: msg.header
            })
          );
        };

        future.onIOPub = ioMsg => {
          if (ioMsg.header.msg_type === 'stream') {
            // trigger onDone
            tester.send(
              KernelMessage.createMessage<KernelMessage.IStatusMsg>({
                ...options,
                channel: 'iopub',
                msgType: 'status',
                content: {
                  execution_state: 'idle'
                },
                parentHeader: msg.header
              })
            );
          }
        };
      });

      const kernel = await tester.start();
      future = kernel.requestExecute(content);
      await future.done;
      expect(future.isDisposed).toBe(true);
      await tester.shutdown();
      tester.dispose();
    });

    it('should not dispose of KernelFuture when disposeOnDone=false', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const future = defaultKernel.requestExecute(options, false);
      await future.done;
      expect(future.isDisposed).toBe(false);
      future.dispose();
      expect(future.isDisposed).toBe(true);
    });
  });

  describe('#checkExecuteMetadata()', () => {
    it('should accept cell metadata as part of request', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const metadata = { cellId: 'test' };
      const future = defaultKernel.requestExecute(options, false, metadata);
      await future.done;
      expect(future.msg.metadata).toEqual(metadata);
    });
  });

  describe('#registerMessageHook()', () => {
    it('should have the most recently registered hook run first', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      let future: Kernel.IShellFuture;

      let kernel: Kernel.IKernelConnection;

      const tester = new KernelTester();
      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const session = 'session';
        tester.send(
          KernelMessage.createMessage({
            parentHeader,
            session,
            channel: 'shell',
            msgType: 'comm_open',
            content: { comm_id: 'B', data: {}, target_name: 'C' }
          })
        );

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'stream',
              content: { name: 'stdout', text: 'foo' }
            })
          );
          // trigger onDone
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'status',
              content: { execution_state: 'idle' }
            })
          );
        };

        kernel.registerMessageHook(parentHeader.msg_id, async msg => {
          // Make this hook call asynchronous
          // tslint:disable-next-line:await-promise
          await calls.push('last');
          return true;
        });

        kernel.registerMessageHook(parentHeader.msg_id, msg => {
          calls.push('first');
          // not returning should also continue handling
          return void 0 as any;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      // the last hook was called for the stream and the status message.
      expect(calls).toEqual([
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
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];

      const tester = new KernelTester();
      let future: Kernel.IShellFuture;
      let kernel: Kernel.IKernelConnection;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const session = 'session';
        tester.send(
          KernelMessage.createMessage({
            parentHeader,
            session,
            channel: 'shell',
            msgType: 'comm_open',
            content: { comm_id: 'B', data: {}, target_name: 'C' }
          })
        );

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'stream',
              content: { name: 'stdout', text: 'foo' }
            })
          );
          // trigger onDone
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'status',
              content: { execution_state: 'idle' }
            })
          );
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
          // tslint:disable-next-line:await-promise
          await calls.push('iopub');
        };
      });

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      // the last hook was called for the stream and the status message.
      expect(calls).toEqual(['first', 'first']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should process additions on the next run', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      const tester = new KernelTester();
      let future: Kernel.IShellFuture;
      let kernel: Kernel.IKernelConnection;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const session = 'session';
        tester.send(
          KernelMessage.createMessage({
            parentHeader,
            session,
            channel: 'shell',
            msgType: 'comm_open',
            content: { comm_id: 'B', data: {}, target_name: 'C' }
          })
        );

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'stream',
              content: { name: 'stdout', text: 'foo' }
            })
          );
          // trigger onDone
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'status',
              content: { execution_state: 'idle' }
            })
          );
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
      expect(calls).toEqual(['last', 'iopub', 'first', 'last', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });

    it('should deactivate a hook immediately on removal', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      const tester = new KernelTester();
      let future: Kernel.IShellFuture;
      let kernel: Kernel.IKernelConnection;

      tester.onMessage(message => {
        // send a reply
        const parentHeader = message.header;
        const session = 'session';
        tester.send(
          KernelMessage.createMessage({
            parentHeader,
            session,
            channel: 'shell',
            msgType: 'comm_open',
            content: { comm_id: 'B', data: {}, target_name: 'C' }
          })
        );

        future.onReply = () => {
          // trigger onIOPub with a 'stream' message
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'stream',
              content: { name: 'stdout', text: 'foo' }
            })
          );
          // trigger onDone
          tester.send(
            KernelMessage.createMessage({
              parentHeader,
              session,
              channel: 'iopub',
              msgType: 'status',
              content: { execution_state: 'idle' }
            })
          );
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
      expect(calls).toEqual(['first', 'delete', 'iopub', 'first', 'iopub']);
      await tester.shutdown();
      tester.dispose();
    });
  });

  describe('handles messages asynchronously', () => {
    // TODO: Also check that messages are canceled appropriately. In particular, when
    // a kernel is restarted, then a message is sent for a comm open from the
    // old session, the comm open should be canceled.

    it('should run handlers in order', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
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
        pushReply(
          tester.sendExecuteReply('execute reply', {
            status: 'ok',
            execution_count: 1,
            user_expressions: {}
          })
        );

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
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'kernel hook b']);
        return true;
      });

      kernel.registerMessageHook(future.msg.header.msg_id, async msg => {
        calls.push([msg.header.msg_id, 'kernel hook a']);
        return true;
      });

      kernel.registerCommTarget('commtarget', async (comm, msg) => {
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'comm open']);

        comm.onMsg = async msg => {
          // tslint:disable-next-line:await-promise
          await calls.push([msg.header.msg_id, 'comm msg']);
        };
        comm.onClose = async msg => {
          // tslint:disable-next-line:await-promise
          await calls.push([msg.header.msg_id, 'comm close']);
        };
      });

      future.registerMessageHook(async msg => {
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'future hook b']);
        return true;
      });

      future.registerMessageHook(async msg => {
        // Delay processing until after we've checked the anyMessage results.
        await handlingBlock.promise;
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'future hook a']);
        return true;
      });

      future.onIOPub = async msg => {
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'iopub']);
      };

      future.onStdin = async msg => {
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'stdin']);
      };

      future.onReply = async msg => {
        // tslint:disable-next-line:await-promise
        await calls.push([msg.header.msg_id, 'reply']);
      };

      // Give the kernel time to receive and queue up the messages.
      await anyMessageDone.promise;

      // At this point, the synchronous anyMessage signal should have been
      // emitted for every message, but no actual message handling should have
      // happened.
      expect(msgSignal).toEqual(msgSignalExpected);
      expect(calls).toEqual([]);

      // Release the lock on message processing.
      handlingBlock.resolve(undefined);
      await future.done;
      expect(calls).toEqual(callsExpected);

      await tester.shutdown();
      tester.dispose();
    });
  });

  describe('should support subshells', () => {
    it('#supportsSubshells should return true', () => {
      expect(defaultKernel.supportsSubshells).toBeTruthy();
    });

    it('#subshellId should be null in main shell', () => {
      expect(defaultKernel.subshellId).toBeNull();
    });

    it('should create and delete a subshell', async () => {
      // Start with no subshells
      const listReply0 = await defaultKernel.requestListSubshell({}).done;
      expect(listReply0.content.subshell_id).toEqual([]);

      // Create new subshell
      const createReply = await defaultKernel.requestCreateSubshell({}).done;
      const subshellId = createReply.content.subshell_id;
      expect(subshellId).not.toBeNull();

      // Check one subshell exists
      const listReply1 = await defaultKernel.requestListSubshell({}).done;
      expect(listReply1.content.subshell_id).toEqual([`${subshellId}`]);

      // Delete subshell
      await defaultKernel.requestDeleteSubshell({ subshell_id: subshellId })
        .done;

      // Finish with no subshells
      const listReply2 = await defaultKernel.requestListSubshell({}).done;
      expect(listReply2.content.subshell_id).toEqual([]);
    });
  });
});
