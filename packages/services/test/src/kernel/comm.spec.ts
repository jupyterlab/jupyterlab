// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as utils
  from '../../../lib/utils';

import {
  KernelMessage, Kernel
} from '../../../lib/kernel';

import {
  KernelTester
} from '../utils';


describe('jupyter.services - Comm', () => {

  let tester: KernelTester;
  let kernel: Kernel.IKernel;

  beforeEach((done) => {
    tester = new KernelTester();
    Kernel.startNew().then(k => {
      kernel = k;
      return kernel.ready;
    }).then(() => {
      done();
    }).catch(done);
  });

  afterEach(() => {
    if (kernel) {
      kernel.dispose();
    }
    tester.dispose();
  });

  describe('Kernel', () => {

    context('#connectToComm()', () => {

      it('should create an instance of IComm', () => {
        let comm = kernel.connectToComm('test');
        expect(comm.targetName).to.be('test');
        expect(typeof comm.commId).to.be('string');
      });

      it('should use the given commId', () => {
        let comm = kernel.connectToComm('test', '1234');
        expect(comm.targetName).to.be('test');
        expect(comm.commId).to.be('1234');
      });

      it('should create an instance of IComm', () => {
        let comm = kernel.connectToComm('test', '1234');
        expect(comm.targetName).to.be('test');
        expect(comm.commId).to.be('1234');
      });

      it('should use the given commId', () => {
        let comm = kernel.connectToComm('test', '1234');
        expect(comm.targetName).to.be('test');
        expect(comm.commId).to.be('1234');
      });

      it('should reuse an existing comm', (done) => {
        let comm = kernel.connectToComm('test', '1234');
        comm.onClose = () => {
          done();
        };
        let comm2 = kernel.connectToComm('test', '1234');
        comm2.close();  // should trigger comm to close
      });
    });

    context('#registerCommTarget()', () => {

      it('should call the provided callback', (done) => {
        kernel.registerCommTarget('test', (comm, msg) => {
          let content = msg.content;
          kernel.connectToComm(content.target_name, content.comm_id);
          done();
        });
        let contents = {
          target_name: 'test',
          comm_id: utils.uuid(),
          data: { foo: 'bar'}
        };
        sendCommMessage(tester, kernel, 'comm_open', contents);
      });
    });

    context('#commInfo()', () => {

      it('should get the comm info', (done) => {
        tester.onMessage((msg) => {
          msg.parent_header = msg.header;
          msg.content = {
            comms: {
               '1234': 'test',
               '5678': 'test2',
               '4321': 'test'

            }
          };
          tester.send(msg);
        });
        kernel.requestCommInfo({ }).then((msg) => {
          let comms = msg.content.comms as any;
          expect(comms['1234']).to.be('test');
          done();
        });
      });

      it('should allow an optional target', (done) => {
        tester.onMessage((msg) => {
          msg.parent_header = msg.header;
          msg.content = {
            comms: {
               '1234': 'test',
               '4321': 'test'
            }
          };
          tester.send(msg);
        });
        kernel.requestCommInfo({ target: 'test' }).then((msg) => {
          let comms = msg.content.comms as any;
          expect(comms['1234']).to.be('test');
          done();
        });
      });
    });

    context('#isDisposed', () => {

      it('should be true after we dispose of the comm', () => {
        let comm = kernel.connectToComm('test');
        expect(comm.isDisposed).to.be(false);
        comm.dispose();
        expect(comm.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let comm = kernel.connectToComm('test');
        expect(comm.isDisposed).to.be(false);
        expect(comm.isDisposed).to.be(false);
        comm.dispose();
        expect(comm.isDisposed).to.be(true);
        expect(comm.isDisposed).to.be(true);
      });
    });

    context('#dispose()', () => {

      it('should dispose of the resources held by the comm', () => {
        let comm = kernel.connectToComm('foo');
        comm.dispose();
        expect(comm.isDisposed).to.be(true);
      });
    });

    describe('#_handleOpen()', () => {

      it('should load a required module', () => {
        let contents = {
          target_name: 'test',
          target_module: '../../../test/build/target',
          comm_id: '1234',
          data: { foo: 'bar'}
        };
        sendCommMessage(tester, kernel, 'comm_open', contents);
        kernel.connectToComm('test', '1234');
      });

      it('should fail to load the module', () => {
        let contents = {
          target_name: 'test2',
          target_module: '../../../test/build/target',
          comm_id: '1234',
          data: { foo: 'bar'}
        };
        sendCommMessage(tester, kernel, 'comm_open', contents);
        kernel.connectToComm('test2', '1234');
      });

      it('should fail to find the target', () => {
        let contents = {
          target_name: 'unavailable',
          target_module: '../../../test/build/target',
          comm_id: '1234',
          data: { foo: 'bar'}
        };
        sendCommMessage(tester, kernel, 'comm_open', contents);
        kernel.connectToComm('test2', '1234');
      });

    });
  });

  describe('IComm', () => {

    context('#commId', () => {

      it('should be a string', () => {
        let comm = kernel.connectToComm('test');
        expect(typeof comm.commId).to.be('string');
      });

    });

    context('#targetName', () => {

      it('should be a string', () => {
        let comm = kernel.connectToComm('test');
        expect(comm.targetName).to.be('test');
      });

    });

    context('#onClose', () => {

      it('should be readable and writable function', (done) => {
        let comm = kernel.connectToComm('test');
        comm.onClose = (data) => {
          done();
        };
        expect(typeof comm.onClose).to.be('function');
        comm.close();
      });

      it('should be called when the server side closes', (done) => {
        let comm = kernel.connectToComm('test');
        comm.onClose = (msg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          done();
        };
        let content = {
          comm_id: comm.commId,
          target_name: comm.targetName,
          data: { foo: 'bar' }
        };
        sendCommMessage(tester, kernel, 'comm_close', content);
      });

      it('should ignore a close message for an unregistered id', () => {
        let comm = kernel.connectToComm('test');
        let content = {
          comm_id: '1234',
          target_name: comm.targetName
        };
        sendCommMessage(tester, kernel, 'comm_close', content);
      });
    });

    context('#onMsg', () => {
      it('should be readable and writable function', (done) => {
        let comm = kernel.connectToComm('test');
        comm.onMsg = (msg) => {
          done();
        };
        expect(typeof comm.onMsg).to.be('function');
        let options: KernelMessage.IOptions = {
          msgType: 'comm_msg',
          channel: 'iopub',
          username: kernel.username,
          session: kernel.clientId
        };
        let msg = KernelMessage.createMessage(options);
        comm.onMsg(msg as KernelMessage.ICommMsgMsg);
      });

      it('should be called when the server side sends a message', (done) => {
        let comm = kernel.connectToComm('test');
        comm.onMsg = (msg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          done();
        };
        let content = {
          comm_id: comm.commId,
          target_name: comm.targetName,
          data: { foo: 'bar' }
        };
        sendCommMessage(tester, kernel, 'comm_msg', content);
      });

      it('should ignore a message for an unregistered id', () => {
        let comm = kernel.connectToComm('test');
        let content = {
          comm_id: '1234',
          target_name: comm.targetName
        };
        sendCommMessage(tester, kernel, 'comm_msg', content);
      });
    });

    context('#open()', () => {

      it('should send a message to the server', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg: KernelMessage.ICommOpenMsg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          done();
        });
        comm.open({ foo: 'bar' }, { fizz: 'buzz' });
      });

      it('should yield a future', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg) => {
          msg.parent_header = msg.header;
          msg.channel = 'iopub';
          tester.send(msg);
        });
        let future = comm.open();
        future.onIOPub = () => {
          done();
        };
      });
    });

    context('#send()', () => {

      it('should send a message to the server', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg: KernelMessage.ICommMsgMsg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          let decoder = new TextDecoder('utf8');
          let item = msg.buffers[0] as DataView;
          expect(decoder.decode(item)).to.be('hello');
          done();
        });
        let encoder = new TextEncoder('utf8');
        let data = encoder.encode('hello');
        comm.send({ foo: 'bar' }, { fizz: 'buzz' }, [data, data.buffer]);
      });

      it('should yield a future', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg) => {
          msg.parent_header = msg.header;
          msg.channel = 'iopub';
          tester.send(msg);
        });
        let future = comm.send('foo');
        future.onIOPub = () => {
          done();
        };
      });
    });

    context('#close()', () => {

      it('should send a message to the server', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg: KernelMessage.ICommCloseMsg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          done();
        });
        comm.close({ foo: 'bar' }, { });
      });

      it('should trigger an onClose', (done) => {
        let comm = kernel.connectToComm('test');
        comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
          expect(msg.content.data).to.eql({ foo: 'bar' });
          done();
        };
        comm.close({ foo: 'bar' });
      });

      it('should not send subsequent messages', () => {
        let comm = kernel.connectToComm('test');
        comm.close({ foo: 'bar' });
        expect(comm.send('test')).to.be(void 0);
      });

      it('should be a no-op if already closed', () => {
        let comm = kernel.connectToComm('test');
        comm.close({ foo: 'bar' });
        comm.close();
      });

      it('should yield a future', (done) => {
        let comm = kernel.connectToComm('test');
        tester.onMessage((msg) => {
          msg.parent_header = msg.header;
          msg.channel = 'iopub';
          tester.send(msg);
        });
        let future = comm.close();
        future.onIOPub = () => {
          done();
        };
      });
    });

  });
});


function sendCommMessage(tester: KernelTester, kernel: Kernel.IKernel, msgType: string, content: any) {
  let options: KernelMessage.IOptions = {
    msgType: msgType,
    channel: 'iopub',
    username: kernel.username,
    session: kernel.clientId
  };
  let msg = KernelMessage.createMessage(options, content);
  tester.send(msg);
}
