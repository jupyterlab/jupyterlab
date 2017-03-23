// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONObject, JSONExt
} from '@phosphor/coreutils';

import * as NodeWebSocket
  from 'ws';

import {
  XMLHttpRequest as NodeXMLHttpRequest
} from 'xmlhttprequest';

import {
  ConfigWithDefaults, ContentsManager, KernelMessage, Contents,
  TerminalManager, Session, Kernel,
  TerminalSession, ConfigSection
} from '../../lib';


// Stub for node global.
declare var global: any;
global.XMLHttpRequest = NodeXMLHttpRequest;
global.WebSocket = NodeWebSocket;


describe('jupyter.services - Integration', () => {

  describe('Kernel', () => {

    it('should get kernel specs and start', () => {
      // get info about the available kernels and connect to one
      let kernel: Kernel.IKernel;
      return Kernel.getSpecs().then((specs) => {
        return Kernel.startNew({ name: specs.default });
      }).then(k => {
        kernel = k;
        return kernel.shutdown();
      }).then(() => {
        // It should handle another shutdown request.
        return Kernel.shutdown(kernel.id);
      });
    });

    it('should interrupt and restart', () => {
      let kernel: Kernel.IKernel;
      return Kernel.startNew().then(value => {
        kernel = value;
        return kernel.ready;
      }).then(() => {
        return kernel.interrupt();
      }).then(() => {
        return kernel.restart();
      }).then(() => {
        return kernel.shutdown();
      });
    });

    it('should get info', () => {
      let kernel: Kernel.IKernel;
      let content: KernelMessage.IInfoReply;
      return Kernel.startNew().then(value => {
        kernel = value;
        return kernel.requestKernelInfo();
      }).then((info) => {
        content = info.content;
        expect(JSONExt.deepEqual(content, kernel.info)).to.be(true);
        return kernel.shutdown();
      });
    });

    it('should connect to existing kernel and list running kernels', () => {
      let kernel: Kernel.IKernel;
      let kernel2: Kernel.IKernel;
      return Kernel.startNew().then(value => {
        kernel = value;
        // should grab the same kernel object
        return Kernel.connectTo(kernel.id);
      }).then(value => {
        kernel2 = value;
        if (kernel2.clientId === kernel.clientId) {
          throw Error('Did create new kernel');
        }
        if (kernel2.id !== kernel.id) {
          throw Error('Did clone kernel');
        }
        return Kernel.listRunning();
      }).then(kernels => {
        if (!kernels.length) {
          throw Error('Should be one at least one running kernel');
        }
        return kernel.shutdown();
      });
    });

    it('should trigger a reconnect', () => {
      let kernel: Kernel.IKernel;
      return Kernel.startNew().then(value => {
        kernel = value;
        return kernel.reconnect();
      }).then(() => {
        return kernel.shutdown();
      });
    });

    it('should handle other kernel messages', () => {
      let kernel: Kernel.IKernel;
      return Kernel.startNew().then(value => {
        kernel = value;
        return kernel.requestComplete({ code: 'impor', cursor_pos: 4 });
      }).then(msg => {
        return kernel.requestInspect({ code: 'hex', cursor_pos: 2, detail_level: 0 });
      }).then(msg => {
        return kernel.requestIsComplete({ code: 'from numpy import (\n' });
      }).then(msg => {
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
        return kernel.requestHistory(options);
      }).then(msg => {
        let future = kernel.requestExecute({ code: 'a = 1\n' });
        future.onReply = (reply: KernelMessage.IExecuteReplyMsg) => {
          expect(reply.content.status).to.be('ok');
        };
        future.onDone = () => {
          console.log('Execute finished');
          return kernel.shutdown();
        };
      });
    });

  });

  describe('Session', () => {

    it('should start, connect to existing session and list running sessions', () => {
      let options: Session.IOptions = { path: 'Untitled1.ipynb' };
      let session: Session.ISession;
      let session2: Session.ISession;
      let id = '';
      return Session.startNew(options).then(value => {
        session = value;
        return session.rename('Untitled2.ipynb');
      }).then(() => {
        expect(session.path).to.be('Untitled2.ipynb');
        // should grab the same session object
        return Session.connectTo(session.id);
      }).then(value => {
        expect(value.path).to.be(options.path);
        session2 = value;
        if (session2.kernel.clientId === session.kernel.clientId) {
          throw Error('Did not clone the session');
        }
        if (session2.kernel.id !== session.kernel.id) {
          throw Error('Did not clone the session');
        }
        return Session.listRunning();
      }).then(sessions => {
        if (!sessions.length) {
          throw Error('Should be one at least one running session');
        }
        id = session.id;
        return session.shutdown();
      }).then(() => {
        // It should handle another shutdown request.
        return Session.shutdown(id);
      });
    });

    it('should connect to an existing kernel', () => {
      let kernel: Kernel.IKernel;
      return Kernel.startNew().then(value => {
        kernel = value;
        let sessionOptions: Session.IOptions = {
          kernelId: kernel.id,
          path: 'Untitled1.ipynb'
        };
        return Session.startNew(sessionOptions);
      }).then(session => {
        expect(session.kernel.id).to.be(kernel.id);
        return session.shutdown();
      });
    });

    it('should be able to switch to an existing kernel by id', () => {
      let kernel: Kernel.IKernel;
      let session: Session.ISession;
      return Kernel.startNew().then(value => {
        kernel = value;
        let sessionOptions: Session.IOptions = { path: 'Untitled1.ipynb' };
        return Session.startNew(sessionOptions);
      }).then(value => {
        session = value;
        return session.changeKernel({ id: kernel.id });
      }).then(newKernel => {
        expect(newKernel.id).to.be(kernel.id);
        return session.shutdown();
      });
    });

    it('should be able to switch to a new kernel by name', () => {
      // Get info about the available kernels and connect to one.
      let options: Session.IOptions = { path: 'Untitled1.ipynb' };
      let id: string;
      let session: Session.ISession;
      return Session.startNew(options).then(value => {
        session = value;
        id = session.kernel.id;
        return session.changeKernel({ name: session.kernel.name });
      }).then(newKernel => {
        expect(newKernel.id).to.not.be(id);
        return session.shutdown();
      });
    });

    it('should handle a path change', () => {
      let options: Session.IOptions = { path: 'Untitled2a.ipynb' };
      let session: Session.ISession;
      let newPath = 'Untitled2b.ipynb';
      return Session.startNew(options).then(s => {
        session = s;
        return session.rename(newPath);
      }).then(() => {
        expect(session.path).to.be(newPath);
        expect(session.model.notebook.path).to.be(newPath);
      });
    });

  });

  describe('Comm', () => {

    it('should start a comm from the server end', (done) => {
      Kernel.startNew().then((kernel) => {
        kernel.registerCommTarget('test', (comm, msg) => {
          let content = msg.content;
          expect(content.target_name).to.be('test');
          comm.onMsg = (msg) => {
            expect(msg.content.data).to.be('hello');
            comm.send('0');
            comm.send('1');
            comm.send('2');
          };
          comm.onClose = (msg) => {
            expect(msg.content.data).to.eql(['0', '1', '2']);
            done();
          };
        });
        let code = [
          'from ipykernel.comm import Comm',
          'comm = Comm(target_name="test")',
          'comm.send(data="hello")',
          'msgs = []',
          'def on_msg(msg):',
          '    msgs.append(msg["content"]["data"])',
          '    if len(msgs) == 3:',
          '       comm.close(msgs)',
          'comm.on_msg(on_msg)'
        ].join('\n');
        kernel.requestExecute({ code: code });
      }).catch(done);
    });

  });

  describe('Config', () => {

    it('should get a config section on the server and update it', () => {
      let config: ConfigWithDefaults;
      return ConfigSection.create({ name: 'notebook' }).then(section => {
        let defaults: JSONObject = { default_cell_type: 'code' };
        config = new ConfigWithDefaults({ section, defaults, className: 'Notebook' });
        expect(config.get('default_cell_type')).to.be('code');
        return config.set('foo', 'bar');
      }).then(() => {
        expect(config.get('foo')).to.be('bar');
      });
    });

  });

  describe('ContentManager', () => {

    it('should list a directory and get the file contents', () => {
      let contents = new ContentsManager();
      let content: Contents.IModel[];
      let path = '';
      return contents.get('src').then(listing => {
        content = listing.content as Contents.IModel[];
        for (let i = 0; i < content.length; i++) {
          if (content[i].type === 'file') {
            path = content[i].path;
            return contents.get(path, { type: 'file' });
          }
        }
      }).then(msg => {
        expect(msg.path).to.be(path);
      });
    });

    it('should create a new file, rename it, and delete it', () => {
      let contents = new ContentsManager();
      let options: Contents.ICreateOptions = { type: 'file', ext: '.ipynb' };
      return contents.newUntitled(options).then(model0 => {
        return contents.rename(model0.path, 'foo.ipynb');
      }).then(model1 => {
        expect(model1.path).to.be('foo.ipynb');
        return contents.delete('foo.ipynb');
      });
    });

    it('should create a file by name and delete it', () => {
      let contents = new ContentsManager();
      let options: Contents.IModel = {
        type: 'file', content: '', format: 'text'
      };
      return contents.save('baz.txt', options).then(model0 => {
        return contents.delete('baz.txt');
      });
    });

    it('should exercise the checkpoint API', () => {
      let contents = new ContentsManager();
      let options: Contents.IModel = {
        type: 'file', format: 'text', content: 'foo'
      };
      let checkpoint: Contents.ICheckpointModel;
      return contents.save('baz.txt', options).then(model0 => {
        expect(model0.name).to.be('baz.txt');
        return contents.createCheckpoint('baz.txt');
      }).then(value => {
        checkpoint = value;
        return contents.listCheckpoints('baz.txt');
      }).then(checkpoints => {
        expect(checkpoints[0]).to.eql(checkpoint);
        return contents.restoreCheckpoint('baz.txt', checkpoint.id);
      }).then(() => {
        return contents.deleteCheckpoint('baz.txt', checkpoint.id);
      }).then(() => {
        return contents.delete('baz.txt');
      });
    });

  });

  describe('TerminalSession.startNew', () => {

    it('should create and shut down a terminal session', () => {
      let session: TerminalSession.ISession;
      return TerminalSession.startNew().then(s => {
        session = s;
        return session.ready;
      }).then(() => {
        return session.reconnect();
      }).then(() => {
        return session.shutdown();
      });
    });

  });

  describe('TerminalManager', () => {

    it('should create, list, and shutdown by name', () => {
      let manager = new TerminalManager();
      let name = '';
      return manager.ready.then(() => {
        return manager.startNew();
      }).then(session => {
        name = session.name;
        return manager.refreshRunning();
      }).then(() => {
        let running = toArray(manager.running());
        expect(running.length).to.be(1);
        return manager.shutdown(name);
      }).then(() => {
        return manager.refreshRunning();
      }).then(() => {
        expect(manager.running().next()).to.be(void 0);
        // It should handle another shutdown request.
        return manager.shutdown(name);
      });
    });

  });

});
