// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  PageConfig, uuid
} from '@jupyterlab/coreutils';

import {
  toArray
} from '@phosphor/algorithm';

import {
  Signal
} from '@phosphor/signaling';

import {
  ServerConnection
} from '../../../lib/serverconnection';

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  Session
} from '../../../lib/session';

import {
  expectFailure, handleRequest, makeSettings,
  SessionTester, createSessionModel, getRequestHandler, init, testEmission
} from '../utils';


init();

/**
 * Create session options based on a sessionModel.
 */
function createSessionOptions(sessionModel: Session.IModel, serverSettings: ServerConnection.ISettings): Session.IOptions {
  return {
    path: sessionModel.path,
    kernelName: sessionModel.kernel.name,
    serverSettings
  };
}


/**
 * Start a new session with a unique name.
 */
function startNew(): Promise<Session.ISession> {
  return Session.startNew({ path: uuid() });
}


describe('session', () => {

  let session: Session.ISession;
  let defaultSession: Session.ISession;

  before(async () => {
    defaultSession = await startNew();
    await defaultSession.kernel.ready;
  });

  afterEach(async () => {
    if (session && !session.isDisposed) {
      await session.kernel.ready;
      await session.shutdown();
    }
  });

  after(async () => {
    await defaultSession.kernel.ready;
    await defaultSession.shutdown();
  });

  describe('Session.listRunning()', () => {

    it('should yield a list of valid session models', () => {
      return Session.listRunning().then(response => {
        let running = toArray(response);
        expect(running.length).to.greaterThan(0);
      });
    });

    it('should throw an error for an invalid model', (done) => {
      let data = { id: '1234', path: 'test' };
      let serverSettings = getRequestHandler(200, data);
      let list = Session.listRunning(serverSettings);
      expectFailure(list, done);
    });

    it('should throw an error for another invalid model', (done) => {
      let data = [{ id: '1234', kernel: { id: '', name: '' }, path: '' }];
      let serverSettings = getRequestHandler(200, data);
      let list = Session.listRunning(serverSettings);
      expectFailure(list, done);
    });

    it('should fail for wrong response status', (done) => {
      let serverSettings = getRequestHandler(201, [createSessionModel()]);
      let list = Session.listRunning(serverSettings);
      expectFailure(list, done);
    });

    it('should fail for error response status', (done) => {
      let serverSettings = getRequestHandler(500, { });
      let list = Session.listRunning(serverSettings);
      expectFailure(list, done, '');
    });

  });

  describe('Session.startNew', () => {

    it('should start a session', async () => {
      return startNew().then(s => {
        session = s;
        expect(session.id).to.be.ok();
      });
    });

    it('should accept ajax options', (done) => {
      let serverSettings = makeSettings();
      let options: Session.IOptions = { path: uuid(), serverSettings };
      Session.startNew(options).then(s => {
        session = s;
        expect(session.id).to.ok();
        done();
      });
    });

    it('should start even if the websocket fails', () => {
      let tester = new SessionTester();
      tester.initialStatus = 'dead';
      return tester.startSession().then(() => {
        tester.dispose();
      });
    });

    it('should fail for wrong response status', (done) => {
      let sessionModel = createSessionModel();
      let serverSettings = getRequestHandler(200, sessionModel);
      let options = createSessionOptions(sessionModel, serverSettings);
      let sessionPromise = Session.startNew(options);
      expectFailure(sessionPromise, done);
    });

    it('should fail for error response status', (done) => {
      let serverSettings = getRequestHandler(500, {});
      let sessionModel = createSessionModel();
      let options = createSessionOptions(sessionModel, serverSettings);
      let sessionPromise = Session.startNew(options);
      expectFailure(sessionPromise, done, '');
    });

    it('should fail for wrong response model', (done) => {
      let sessionModel = createSessionModel();
      (sessionModel as any).path = 1;
      let serverSettings = getRequestHandler(201, sessionModel);
      let options = createSessionOptions(sessionModel, serverSettings);
      let sessionPromise = Session.startNew(options);
      let msg = `Property 'path' is not of type 'string'`;
      expectFailure(sessionPromise, done, msg);
    });

    it('should handle a deprecated response model', () => {
      let sessionModel = createSessionModel();
      let data = {
        id: sessionModel.id,
        kernel: sessionModel.kernel,
        notebook: { path: sessionModel.path }
      };
      let serverSettings = getRequestHandler(201, data);
      let options = createSessionOptions(sessionModel, serverSettings);
      return Session.startNew(options);
    });
  });

  describe('Session.findByPath()', () => {

    it('should find an existing session by path', () => {
      return Session.findByPath(defaultSession.path);
    });

  });

  describe('Session.findById()', () => {

    it('should find an existing session by id', () => {
      return Session.findById(defaultSession.id);
    });

  });

  describe('Session.connectTo()', () => {

    it('should connect to a running session', () => {
      return Session.connectTo(defaultSession.model).then(newSession => {
        expect(newSession.id).to.be(defaultSession.id);
        expect(newSession.kernel.id).to.be(defaultSession.kernel.id);
        expect(newSession).to.not.be(defaultSession);
        expect(newSession.kernel).to.not.be(defaultSession.kernel);
      });
    });

    it('should accept server settings', () => {
      let serverSettings = makeSettings();
      return Session.connectTo(defaultSession.model, serverSettings).then(session => {
        expect(session.id).to.be.ok();
      });
    });

  });

  describe('Session.shutdown()', () => {

    it('should shut down a kernel by id', async () => {
      session = await startNew();
      await session.kernel.ready;
      await Session.shutdown(session.id);
    });

    it('should handle a 404 status', () => {
      return Session.shutdown(uuid());
    });

  });

  describe('Session.ISession', () => {

    context('#terminated', () => {

      it('should emit when the session is shut down', async () => {
        let called = false;
        session = await startNew();
        await session.kernel.ready;
        session.terminated.connect(() => {
          called = true;
        });
        await session.shutdown();
        session.dispose();
        expect(called).to.be(true);
      });
    });

    context('#kernelChanged', () => {

      it('should emit when the kernel changes', async () => {

        let called = false;
        let object = {};
        defaultSession.kernelChanged.connect((s, kernel) => {
          called = true;
          Signal.disconnectReceiver(object);
        }, object);
        let previous = defaultSession.kernel;
        await defaultSession.changeKernel({ name: previous.name });
        await defaultSession.kernel.ready;
        expect(called).to.be(true);
        previous.dispose();
      });

    });

    context('#statusChanged', () => {

      it('should emit when the kernel status changes', () => {
        let called = false;
        defaultSession.statusChanged.connect((s, status) => {
          if (status === 'busy') {
            called = true;
          }
        });
        return defaultSession.kernel.requestKernelInfo().then(() => {
          expect(called).to.be(true);
        });
      });
    });

    context('#iopubMessage', () => {

      it('should be emitted for an iopub message', () => {
        let called = false;
        defaultSession.iopubMessage.connect((s, msg) => {
          if (msg.header.msg_type === 'status') {
            called = true;
          }
        });
        return defaultSession.kernel.requestExecute({ code: 'a=1' }, true).done.then(() => {
          expect(called).to.be(true);
        });
      });
    });

    context('#unhandledMessage', () => {

      it('should be emitted for an unhandled message', async () => {
        const tester = new SessionTester();
        const session = await tester.startSession();
        await session.kernel.ready;
        const msgId = uuid();
        const emission = testEmission(session.unhandledMessage, {
          find: (k, msg) => (msg.header.msg_id === msgId)
        });
        let msg = KernelMessage.createShellMessage({
          msgType: 'foo',
          channel: 'shell',
          session: tester.serverSessionId,
          msgId
        });
        msg.parent_header = {session: session.kernel.clientId};
        tester.send(msg);
        await emission;
        await tester.shutdown();
        tester.dispose();
      });

    });

    context('#propertyChanged', () => {

      it('should be emitted when the session path changes', () => {
        let newPath = uuid();
        let called = false;
        let object = {};
        defaultSession.propertyChanged.connect((s, type) => {
          expect(defaultSession.path).to.be(newPath);
          expect(type).to.be('path');
          called = true;
          Signal.disconnectReceiver(object);
        }, object);
        return defaultSession.setPath(newPath).then(() => {
          expect(called).to.be(true);
        });
      });

    });

    context('#id', () => {

      it('should be a string', () => {
        expect(typeof defaultSession.id).to.be('string');
      });
    });

    context('#path', () => {

      it('should be a string', () => {
        expect(typeof defaultSession.path).to.be('string');
      });
    });

    context('#name', () => {

      it('should be a string', () => {
        expect(typeof defaultSession.name).to.be('string');
      });
    });

    context('#type', () => {

      it('should be a string', () => {
        expect(typeof defaultSession.name).to.be('string');
      });
    });

    context('#model', () => {

      it('should be an IModel', () => {
        let model = defaultSession.model;
        expect(typeof model.id).to.be('string');
        expect(typeof model.path).to.be('string');
        expect(typeof model.kernel.name).to.be('string');
        expect(typeof model.kernel.id).to.be('string');
      });

    });

    context('#kernel', () => {

      it('should be an IKernel object', () => {
        expect(typeof defaultSession.kernel.id).to.be('string');
      });

    });

    context('#kernel', () => {

      it('should be a delegate to the kernel status', () => {
        expect(defaultSession.status).to.be(defaultSession.kernel.status);
      });
    });

    context('#serverSettings', () => {

      it('should be the serverSettings', () => {
        expect(defaultSession.serverSettings.baseUrl).to.be(PageConfig.getBaseUrl());
      });

    });

    context('#isDisposed', () => {

      it('should be true after we dispose of the session', () => {
        return Session.connectTo(defaultSession.model).then(session => {
          expect(session.isDisposed).to.be(false);
          session.dispose();
          expect(session.isDisposed).to.be(true);
        });
      });

      it('should be safe to call multiple times', () => {
        return Session.connectTo(defaultSession.model).then(session => {
          expect(session.isDisposed).to.be(false);
          expect(session.isDisposed).to.be(false);
          session.dispose();
          expect(session.isDisposed).to.be(true);
          expect(session.isDisposed).to.be(true);
        });
      });
    });

    context('#dispose()', () => {

      it('should dispose of the resources held by the session', () => {
        return Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          expect(session.isDisposed).to.be(true);
        });
      });

      it('should be safe to call twice', () => {
        return Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          expect(session.isDisposed).to.be(true);
          session.dispose();
          expect(session.isDisposed).to.be(true);
        });
      });

      it('should be safe to call if the kernel is disposed', () => {
        return Session.connectTo(defaultSession.model).then(session => {
          session.kernel.dispose();
          session.dispose();
          expect(session.isDisposed).to.be(true);
        });
      });

    });

    context('#setPath()', () => {

      it('should set the path of the session', () => {
        let newPath = uuid();
        return defaultSession.setPath(newPath).then(() => {
          expect(defaultSession.path).to.be(newPath);
        });
      });

      it('should fail for improper response status', (done) => {
        handleRequest(defaultSession, 201, {});
        expectFailure(defaultSession.setPath(uuid()), done);
      });

      it('should fail for error response status', (done) => {
        handleRequest(defaultSession, 500, {});
        expectFailure(defaultSession.setPath(uuid()), done, '');
      });

      it('should fail for improper model', (done) => {
        handleRequest(defaultSession, 200, {});
        expectFailure(defaultSession.setPath(uuid()), done);
      });

      it('should fail if the session is disposed', (done) => {
        Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          let promise = session.setPath(uuid());
          expectFailure(promise, done, 'Session is disposed');
        }).catch(done);
      });

    });

    context('#setType()', () => {

      it('should set the type of the session', () => {
        let type = uuid();
        return defaultSession.setType(type).then(() => {
          expect(defaultSession.type).to.be(type);
        });
      });

      it('should fail for improper response status', (done) => {
        handleRequest(defaultSession, 201, {});
        expectFailure(defaultSession.setType(uuid()), done);
      });

      it('should fail for error response status', (done) => {
        handleRequest(defaultSession, 500, {});
        expectFailure(defaultSession.setType(uuid()), done, '');
      });

      it('should fail for improper model', (done) => {
        handleRequest(defaultSession, 200, {});
        expectFailure(defaultSession.setType(uuid()), done);
      });

      it('should fail if the session is disposed', (done) => {
        Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          let promise = session.setPath(uuid());
          expectFailure(promise, done, 'Session is disposed');
        }).catch(done);
      });

    });

    context('#setName()', () => {

      it('should set the name of the session', () => {
        let name = uuid();
        return defaultSession.setName(name).then(() => {
          expect(defaultSession.name).to.be(name);
        });
      });

      it('should fail for improper response status', (done) => {
        handleRequest(defaultSession, 201, {});
        expectFailure(defaultSession.setName(uuid()), done);
      });

      it('should fail for error response status', (done) => {
        handleRequest(defaultSession, 500, {});
        expectFailure(defaultSession.setName(uuid()), done, '');
      });

      it('should fail for improper model', (done) => {
        handleRequest(defaultSession, 200, {});
        expectFailure(defaultSession.setName(uuid()), done);
      });

      it('should fail if the session is disposed', (done) => {
        Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          let promise = session.setPath(uuid());
          expectFailure(promise, done, 'Session is disposed');
        });
      });

    });

    context('#changeKernel()', () => {

      it('should create a new kernel with the new name', async () => {
        session = await startNew();
        let previous = session.kernel;
        await previous.ready;
        await session.changeKernel({ name: previous.name });
        await session.kernel.ready;
        expect(session.kernel.name).to.be(previous.name);
        expect(session.kernel.id).to.not.be(previous.id);
        expect(session.kernel).to.not.be(previous);
        previous.dispose();
      });

      it('should accept the id of the new kernel', async () => {
        session = await startNew();
        let previous = session.kernel;
        await previous.ready;
        let kernel = await Kernel.startNew();
        await kernel.ready;
        await session.changeKernel({ id: kernel.id });
        await session.kernel.ready;
        expect(session.kernel.id).to.be(kernel.id);
        expect(session.kernel).to.not.be(previous);
        expect(session.kernel).to.not.be(kernel);
        await previous.dispose();
        await kernel.dispose();
      });

      it('should update the session path if it has changed', async () => {
        session = await startNew();
        let previous = session.kernel;
        await previous.ready;
        let model = { ...session.model, path: 'foo.ipynb' };
        handleRequest(session, 200, model);
        await session.changeKernel({ name: previous.name });
        await session.kernel.ready;
        expect(session.kernel.name).to.be(previous.name);
        expect(session.path).to.be(model.path);
        previous.dispose();
      });

    });

    context('#shutdown()', () => {

      it('should shut down properly', () => {
        return startNew().then(session => {
          return session.shutdown();
        });
      });

      it('should emit a terminated signal', () => {
        let called = false;
        return startNew().then(session => {
          session.terminated.connect(() => {
            called = true;
          });
          return session.shutdown();
        }).then(() => {
          expect(called).to.be(true);
        });
      });

      it('should fail for an incorrect response status', (done) => {
        handleRequest(defaultSession, 200, { });
        expectFailure(defaultSession.shutdown(), done);
      });

      it('should handle a 404 status', () => {
        return startNew().then(session => {
          handleRequest(session, 404, { });
          return session.shutdown();
        });
      });

      it('should handle a specific error status', (done) => {
        handleRequest(defaultSession, 410, { });
        defaultSession.shutdown().catch(err => {
          let text ='The kernel was deleted but the session was not';
          expect(err.message).to.contain(text);
        }).then(done, done);
      });

      it('should fail for an error response status', (done) => {
        handleRequest(defaultSession, 500, { });
        expectFailure(defaultSession.shutdown(), done, '');
      });

      it('should fail if the session is disposed', (done) => {
        Session.connectTo(defaultSession.model).then(session => {
          session.dispose();
          expectFailure(session.shutdown(), done, 'Session is disposed');
        }).catch(done);
      });

      it('should dispose of all session instances', () => {
        let session0: Session.ISession;
        let session1: Session.ISession;
        return startNew().then(s => {
          session0 = s;
          return Session.connectTo(session0.model);
        }).then(s => {
          session1 = s;
          return session0.shutdown();
        }).then(() => {
          expect(session1.isDisposed).to.be(true);
        });
      });

    });

  });

});
