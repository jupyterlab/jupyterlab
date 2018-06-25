// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  KernelTester, createMsg
} from '../utils';


describe('Kernel.IFuture', () => {

  let tester: KernelTester;

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  after(() => {
    Kernel.shutdownAll();
  });

  it('should have a msg attribute', async () => {
    const kernel = await Kernel.startNew();
    const future = kernel.requestExecute({ code: 'print("hello")' });
    expect(typeof future.msg.header.msg_id).to.be('string');
    await future.done;
  });

  describe('Message hooks', () => {

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

        future.registerMessageHook(async (msg) => {
          await calls.push('last');
          return true;
        });

        future.registerMessageHook((msg) => {
          calls.push('first');
          // Check to make sure we actually got the messages we expected.
          if (msg.header.msg_type === 'stream') {
            expect((msg as KernelMessage.IStreamMsg).content.text).to.be('foo');
          } else {
            expect((msg as KernelMessage.IStatusMsg).content.execution_state).to.be('idle');
          }
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
        let msg = createMsg('shell',  parentHeader);
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

        future.registerMessageHook((msg) => {
          calls.push('last');
          return true;
        });

        future.registerMessageHook(async (msg) => {
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

        future.registerMessageHook((msg) => {
          calls.push('last');
          future.registerMessageHook((msg) => {
            calls.push('first');
            return true;
          });
          return true;
        });

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      return tester.start().then(kernel => {
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        expect(calls).to.eql(['last', 'iopub', 'first', 'last', 'iopub']);
      });
    });

    it('should deactivate message hooks immediately on removal', () => {
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

      let toDelete = (msg: KernelMessage.IIOPubMessage) => {
        calls.push('delete');
        return true;
      };
      let first = (msg: KernelMessage.IIOPubMessage) => {
        if (calls.length > 0) {
          // delete the hook the second time around
          future.removeMessageHook(toDelete);
        }
        calls.push('first');
        return true;
      };

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

        future.registerMessageHook(toDelete);
        future.registerMessageHook(first);

        future.onIOPub = () => {
          calls.push('iopub');
        };
      });

      return tester.start().then(kernel => {
        future = kernel.requestExecute(options, false);
        return future.done;
      }).then(() => {
        expect(calls).to.eql(['first', 'delete', 'iopub', 'first', 'iopub']);
        future.dispose();
        future.removeMessageHook(first);
      });
    });

  });

});
