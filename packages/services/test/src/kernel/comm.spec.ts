// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  KernelMessage, Kernel
} from '../../../lib/kernel';

import {
  init
} from '../utils';


// Initialize fetch override.
init();


let BLIP = [
  'from ipykernel.comm import Comm',
  'comm = Comm(target_name="test", data="hello")',
  'comm.send(data="hello")',
  'comm.close("goodbye")'
].join('\n');

let RECEIVE = [
  'def _recv(msg):',
  '    data = msg["content"]["data"]',
  '    if data == "quit":',
  '         comm.close("goodbye")',
  '    else:',
  '         comm.send(data)'
].join('\n');

let SEND = RECEIVE + '\n' + [
  'from ipykernel.comm import Comm',
  'comm = Comm(target_name="test", data="hello")',
  'comm.send(data="hello")',
  'comm.on_msg(_recv)'
].join('\n');

let TARGET = RECEIVE + '\n' + [
  'def target_func(comm, msg):',
  '    comm.on_msg(_recv)',
  'get_ipython().kernel.comm_manager.register_target("test", target_func)'
].join('\n');


describe('jupyter.services - Comm', () => {

  let kernel: Kernel.IKernel;

  before(() => {
    return Kernel.startNew({ name: 'ipython' }).then(k => {
      kernel = k;
    });
  });

  afterEach(() => {
    // A no-op comm target.
    kernel.registerCommTarget('test', (comm, msg) => { /* no op */ });
  });

  after(() => {
    return kernel.shutdown();
  });

  describe('Kernel', () => {

    context('#connectToComm()', () => {

      it('should create an instance of IComm', () => {
        return kernel.connectToComm('test').then(comm => {
          expect(comm.targetName).to.be('test');
          expect(typeof comm.commId).to.be('string');
        });
      });

      it('should use the given id', () => {
        return kernel.connectToComm('test', '1234').then(comm => {
          expect(comm.targetName).to.be('test');
          expect(comm.commId).to.be('1234');
        });
      });

      it('should create an instance of IComm', () => {
        return kernel.connectToComm('test', '1234').then(comm => {
          expect(comm.targetName).to.be('test');
          expect(comm.commId).to.be('1234');
        });
      });

      it('should use the given id', () => {
        return kernel.connectToComm('test', '1234').then(comm => {
          expect(comm.targetName).to.be('test');
          expect(comm.commId).to.be('1234');
        });
      });

      it('should reuse an existing comm', (done) => {
        kernel.connectToComm('test', '1234').then(comm => {
          comm.onClose = () => {
            done();
          };
          kernel.connectToComm('test', '1234').then(comm2 => {
            comm2.close();  // should trigger comm to close
          });
        });
      });
    });

    context('#registerCommTarget()', () => {

      it('should call the provided callback', (done) => {
        let disposable = kernel.registerCommTarget('test', (comm, msg) => {
          disposable.dispose();
          let content = msg.content;
          expect(content.data).to.be('hello');
          comm.dispose();
          done();
        });
        kernel.requestExecute({ code: BLIP }, true).done.catch(done);
      });
    });

    context('#commInfo()', () => {

      it('should get the comm info', (done) => {
        let disposable = kernel.registerCommTarget('test', (comm, msg) => {
          disposable.dispose();
          kernel.requestCommInfo({ }).then((msg) => {
            let comms = msg.content.comms;
            expect(comms[comm.commId].target_name).to.be('test');
            comm.dispose();
            done();
          }).catch(done);
        });
        kernel.requestExecute({ code: SEND }, true).done.catch(done);
      });

      it('should allow an optional target', () => {
        return kernel.requestExecute({ code: SEND }, true).done.then(() => {
          return kernel.requestCommInfo({ target: 'test' });
        }).then(msg => {
          let comms = msg.content.comms;
          for (let id in comms) {
            expect(comms[id].target_name).to.be('test');
          }
        });
      });

    });

    context('#isDisposed', () => {

      it('should be true after we dispose of the comm', () => {
        return kernel.connectToComm('test').then(comm => {
          expect(comm.isDisposed).to.be(false);
          comm.dispose();
          expect(comm.isDisposed).to.be(true);
        });
      });

      it('should be safe to call multiple times', () => {
        return kernel.connectToComm('test').then(comm => {
          expect(comm.isDisposed).to.be(false);
          expect(comm.isDisposed).to.be(false);
          comm.dispose();
          expect(comm.isDisposed).to.be(true);
          expect(comm.isDisposed).to.be(true);
        });
      });
    });

    context('#dispose()', () => {

      it('should dispose of the resources held by the comm', () => {
        return kernel.connectToComm('foo').then(comm => {
          comm.dispose();
          expect(comm.isDisposed).to.be(true);
        });
      });
    });

  });

  describe('IComm', () => {

    let comm: Kernel.IComm;

    beforeEach(() => {
      return kernel.connectToComm('test').then(c => {
        comm = c;
      });
    });

    context('#id', () => {

      it('should be a string', () => {
        expect(typeof comm.commId).to.be('string');
      });

    });

    context('#name', () => {

      it('should be a string', () => {
        expect(comm.targetName).to.be('test');
      });

    });

    context('#onClose', () => {

      it('should be readable and writable function', (done) => {
        expect(comm.onClose).to.be(undefined);
        comm.onClose = msg => {
          done();
        };
        comm.close();
      });

      it('should be called when the server side closes', (done) => {
        kernel.registerCommTarget('test', (comm, msg) => {
          comm.onClose = data => {
            done();
          };
          comm.send('quit');
        });
        kernel.requestExecute({ code: SEND }, true).done.catch(done);
      });

    });

    context('#onMsg', () => {
      it('should be readable and writable function', (done) => {
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
        kernel.registerCommTarget('test', (comm, msg) => {
          comm.onMsg = (msg) => {
            expect(msg.content.data).to.be('hello');
            done();
          };
        });
        kernel.requestExecute({ code: BLIP }, true).done.catch(done);
      });
    });

    context('#open()', () => {

      it('should send a message to the server', () => {
        let future = kernel.requestExecute({ code: TARGET });
        future.done.then(() => {
          let encoder = new TextEncoder('utf8');
          let data = encoder.encode('hello');
          future = comm.open({ foo: 'bar' }, { fizz: 'buzz' }, [data, data.buffer]);
          return future.done;
        });
      });

    });

    context('#send()', () => {

      it('should send a message to the server', () => {
        return comm.open().done.then(() => {
          let future = comm.send({ foo: 'bar' }, { fizz: 'buzz' });
          return future.done;
        });
      });

      it('should pass through a buffers field', () => {
        return comm.open().done.then(() => {
          let future = comm.send({ buffers: 'bar' });
          return future.done;
        });
      });

    });

    context('#close()', () => {

      it('should send a message to the server', () => {
        return comm.open().done.then(() => {
          let encoder = new TextEncoder('utf8');
          let data = encoder.encode('hello');
          let future = comm.close({ foo: 'bar' }, { }, [data, data.buffer]);
          return future.done;
        });
      });

      it('should trigger an onClose', (done) => {
        comm.open().done.then(() => {
          comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
            expect(msg.content.data).to.eql({ foo: 'bar' });
            done();
          };
          let future = comm.close({ foo: 'bar' });
          return future.done;
        }).catch(done);
      });

      it('should not send subsequent messages', () => {
        return comm.open().done.then(() => {
          return comm.close({ foo: 'bar' }).done;
        }).then(() => {
          expect(() => { comm.send('test'); }).to.throwError();
        });
      });

    });

  });
});
