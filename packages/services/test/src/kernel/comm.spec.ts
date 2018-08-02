// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PromiseDelegate } from '@phosphor/coreutils';

import { KernelMessage, Kernel } from '../../../lib/kernel';

import { init } from '../utils';

// Initialize fetch override.
init();

const BLIP = `
from ipykernel.comm import Comm
comm = Comm(target_name="test", data="hello")
comm.send(data="hello")
comm.close("goodbye")
`;

const RECEIVE = `
def _recv(msg):
    data = msg["content"]["data"]
    if data == "quit":
         comm.close("goodbye")
    else:
         comm.send(data)
`;

const SEND = `
${RECEIVE}
from ipykernel.comm import Comm
comm = Comm(target_name="test", data="hello")
comm.send(data="hello")
comm.on_msg(_recv)
`;

const TARGET = `
${RECEIVE}
def target_func(comm, msg):
    comm.on_msg(_recv)
get_ipython().kernel.comm_manager.register_target("test", target_func)
`;

describe('jupyter.services - Comm', () => {
  let kernel: Kernel.IKernel;

  before(async () => {
    kernel = await Kernel.startNew({ name: 'ipython' });
  });

  afterEach(() => {
    // A no-op comm target.
    kernel.registerCommTarget('test', (comm, msg) => {
      /* no op */
    });
  });

  after(() => {
    return kernel.shutdown();
  });

  describe('Kernel', () => {
    context('#connectToComm()', () => {
      it('should create an instance of IComm', () => {
        const comm = kernel.connectToComm('test');
        expect(comm.targetName).to.equal('test');
        expect(typeof comm.commId).to.equal('string');
      });

      it('should use the given id', () => {
        const comm = kernel.connectToComm('test', '1234');
        expect(comm.targetName).to.equal('test');
        expect(comm.commId).to.equal('1234');
      });

      it('should reuse an existing comm', () => {
        const comm = kernel.connectToComm('test', '1234');
        const comm2 = kernel.connectToComm('test', '1234');
        expect(comm).to.equal(comm2);
      });
    });

    context('#registerCommTarget()', () => {
      it('should call the provided callback', async () => {
        const promise = new PromiseDelegate<
          [Kernel.IComm, KernelMessage.ICommOpenMsg]
        >();
        const hook = (comm: Kernel.IComm, msg: KernelMessage.ICommOpenMsg) => {
          promise.resolve([comm, msg]);
        };
        kernel.registerCommTarget('test', hook);

        // Request the comm creation.
        await kernel.requestExecute({ code: SEND }, true).done;

        // Get the comm.
        const [comm, msg] = await promise.promise;
        expect(msg.content.data).to.equal('hello');

        // Clean up
        kernel.removeCommTarget('test', hook);
        comm.dispose();
      });
    });

    context('#commInfo()', () => {
      it('should get the comm info', async () => {
        const commPromise = new PromiseDelegate<Kernel.IComm>();
        const hook = (comm: Kernel.IComm, msg: KernelMessage.ICommOpenMsg) => {
          commPromise.resolve(comm);
        };
        kernel.registerCommTarget('test', hook);

        // Request the comm creation.
        await kernel.requestExecute({ code: SEND }, true).done;

        // Get the comm.
        const comm = await commPromise.promise;

        // Ask the kernel for the list of current comms.
        const msg = await kernel.requestCommInfo({});

        // Test to make sure the comm we just created is listed.
        const comms = msg.content.comms;
        expect(comms[comm.commId].target_name).to.equal('test');

        // Clean up
        kernel.removeCommTarget('test', hook);
        comm.dispose();
      });

      it('should allow an optional target', async () => {
        await kernel.requestExecute({ code: SEND }, true).done;
        const msg = await kernel.requestCommInfo({ target: 'test' });
        const comms = msg.content.comms;
        for (const id in comms) {
          expect(comms[id].target_name).to.equal('test');
        }
      });
    });

    context('#isDisposed', () => {
      it('should be true after we dispose of the comm', () => {
        const comm = kernel.connectToComm('test');
        expect(comm.isDisposed).to.equal(false);
        comm.dispose();
        expect(comm.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const comm = kernel.connectToComm('test');
        expect(comm.isDisposed).to.equal(false);
        expect(comm.isDisposed).to.equal(false);
        comm.dispose();
        expect(comm.isDisposed).to.equal(true);
        expect(comm.isDisposed).to.equal(true);
      });
    });

    context('#dispose()', () => {
      it('should dispose of the resources held by the comm', () => {
        const comm = kernel.connectToComm('foo');
        comm.dispose();
        expect(comm.isDisposed).to.equal(true);
      });
    });
  });

  describe('IComm', () => {
    let comm: Kernel.IComm;

    beforeEach(() => {
      comm = kernel.connectToComm('test');
    });

    context('#id', () => {
      it('should be a string', () => {
        expect(typeof comm.commId).to.equal('string');
      });
    });

    context('#name', () => {
      it('should be a string', () => {
        expect(comm.targetName).to.equal('test');
      });
    });

    context('#onClose', () => {
      it('should be readable and writable function', async () => {
        expect(comm.onClose).to.be.undefined;
        let called = false;
        comm.onClose = msg => {
          called = true;
        };
        await comm.close().done;
        expect(called).to.equal(true);
      });

      it('should be called when the server side closes', async () => {
        let promise = new PromiseDelegate<void>();
        kernel.registerCommTarget('test', (comm, msg) => {
          comm.onClose = data => {
            promise.resolve(void 0);
          };
          comm.send('quit');
        });
        await kernel.requestExecute({ code: SEND }, true).done;
        await promise.promise;
      });
    });

    context('#onMsg', () => {
      it('should be readable and writable function', async () => {
        let called = false;
        comm.onMsg = msg => {
          called = true;
        };
        expect(typeof comm.onMsg).to.equal('function');
        const options: KernelMessage.IOptions = {
          msgType: 'comm_msg',
          channel: 'iopub',
          username: kernel.username,
          session: kernel.clientId
        };
        const msg = KernelMessage.createMessage(options);
        comm.onMsg(msg as KernelMessage.ICommMsgMsg);
        expect(called).to.equal(true);
      });

      it('should be called when the server side sends a message', async () => {
        let called = false;
        kernel.registerCommTarget('test', (comm, msg) => {
          comm.onMsg = msg => {
            expect(msg.content.data).to.equal('hello');
            called = true;
          };
        });
        await kernel.requestExecute({ code: BLIP }, true).done;
        expect(called).to.equal(true);
      });
    });

    context('#open()', () => {
      it('should send a message to the server', async () => {
        let future = kernel.requestExecute({ code: TARGET });
        await future.done;
        const encoder = new TextEncoder();
        const data = encoder.encode('hello');
        future = comm.open({ foo: 'bar' }, { fizz: 'buzz' }, [
          data,
          data.buffer
        ]);
        await future.done;
      });
    });

    context('#send()', () => {
      it('should send a message to the server', async () => {
        await comm.open().done;
        const future = comm.send({ foo: 'bar' }, { fizz: 'buzz' });
        await future.done;
      });

      it('should pass through a buffers field', async () => {
        await comm.open().done;
        const future = comm.send({ buffers: 'bar' });
        await future.done;
      });
    });

    context('#close()', () => {
      it('should send a message to the server', async () => {
        await comm.open().done;
        const encoder = new TextEncoder();
        const data = encoder.encode('hello');
        const future = comm.close({ foo: 'bar' }, {}, [data, data.buffer]);
        await future.done;
      });

      it('should trigger an onClose', async () => {
        await comm.open().done;
        let called = false;
        comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
          expect(msg.content.data).to.deep.equal({ foo: 'bar' });
          called = true;
        };
        const future = comm.close({ foo: 'bar' });
        await future.done;
        expect(called).to.equal(true);
      });

      it('should not send subsequent messages', async () => {
        await comm.open().done;
        await comm.close({ foo: 'bar' }).done;
        expect(() => {
          comm.send('test');
        }).to.throw();
      });
    });
  });
});
