// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { Kernel, KernelAPI, KernelManager, KernelMessage } from '../../src';
import { KernelTester } from '../utils';

describe('Kernel.IShellFuture', () => {
  let server: JupyterServer;
  let tester: KernelTester;
  let kernelManager: KernelManager;

  jest.retryTimes(3);

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
    kernelManager = new KernelManager();
  }, 30000);

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  afterAll(async () => {
    const models = await KernelAPI.listRunning();
    await Promise.all(models.map(m => KernelAPI.shutdownKernel(m.id)));
    await server.shutdown();
  });

  it('should have a msg attribute', async () => {
    const kernel = await kernelManager.startNew();
    await kernel.info;
    const future = kernel.requestExecute({ code: 'print("hello")' });
    expect(typeof future.msg.header.msg_id).toBe('string');
    await future.done;
    await kernel.shutdown();
  });

  describe('Message hooks', () => {
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
      tester = new KernelTester();
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

        future.registerMessageHook(async msg => {
          // tslint:disable-next-line:await-promise
          await calls.push('last');
          return true;
        });

        future.registerMessageHook(msg => {
          calls.push('first');
          // Check to make sure we actually got the messages we expected.
          if (msg.header.msg_type === 'stream') {
            // eslint-disable-next-line jest/no-conditional-expect
            expect((msg as KernelMessage.IStreamMsg).content.text).toBe('foo');
          } else {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(
              (msg as KernelMessage.IStatusMsg).content.execution_state
            ).toBe('idle');
          }
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
      tester = new KernelTester();
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

        future.registerMessageHook(msg => {
          calls.push('last');
          return true;
        });

        future.registerMessageHook(async msg => {
          calls.push('first');
          return false;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      // the last hook was called for the stream and the status message.
      expect(calls).toEqual(['first', 'first']);
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
      tester = new KernelTester();
      let future: Kernel.IShellFuture;

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

        future.registerMessageHook(msg => {
          calls.push('last');
          future.registerMessageHook(msg => {
            calls.push('first');
            return true;
          });
          return true;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      const kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;
      expect(calls).toEqual(['last', 'iopub', 'first', 'last', 'iopub']);
    });

    it('should deactivate message hooks immediately on removal', async () => {
      const options: KernelMessage.IExecuteRequestMsg['content'] = {
        code: 'test',
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: false
      };
      const calls: string[] = [];
      tester = new KernelTester();
      let future: Kernel.IShellFuture;

      const toDelete = (msg: KernelMessage.IIOPubMessage) => {
        calls.push('delete');
        return true;
      };
      const first = (msg: KernelMessage.IIOPubMessage) => {
        if (calls.length > 0) {
          // delete the hook the second time around
          future.removeMessageHook(toDelete);
        }
        calls.push('first');
        return true;
      };

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

        future.registerMessageHook(toDelete);
        future.registerMessageHook(first);

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      const kernel = await tester.start();
      future = kernel.requestExecute(options, false);
      await future.done;

      expect(calls).toEqual(['first', 'delete', 'iopub', 'first', 'iopub']);
      future.dispose();
      future.removeMessageHook(first);
    });
  });
});
