// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PageConfig } from '@jupyterlab/coreutils';

import { UUID } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import {
  KernelMessage,
  SessionManager,
  KernelManager,
  KernelAPI
} from '@jupyterlab/services';

import { Session } from '@jupyterlab/services';

import { expectFailure, testEmission } from '@jupyterlab/testutils';

import { handleRequest, SessionTester, init } from '../utils';

init();

let kernelManager = new KernelManager();
let sessionManager = new SessionManager({ kernelManager });

/**
 * Start a new session with a unique name.
 */
async function startNew(): Promise<Session.ISessionConnection> {
  const session = await sessionManager.startNew({
    path: UUID.uuid4(),
    name: UUID.uuid4(),
    type: 'test'
  });
  return session;
}

describe('session', () => {
  let session: Session.ISessionConnection;
  let defaultSession: Session.ISessionConnection;

  beforeAll(async () => {
    jest.setTimeout(120000);
    defaultSession = await startNew();
  });

  afterEach(async () => {
    if (session && !session.isDisposed) {
      await session.shutdown();
    }
  });

  afterAll(async () => {
    await defaultSession.shutdown();
  });

  describe('Session.DefaultSession', () => {
    describe('#disposed', () => {
      it('should emit when the session is disposed', async () => {
        let called = false;
        session = await startNew();
        session.disposed.connect(() => {
          called = true;
        });
        await session.shutdown();
        session.dispose();
        expect(called).to.equal(true);
      });
    });

    describe('#kernelChanged', () => {
      it('should emit when the kernel changes', async () => {
        let called: Session.ISessionConnection.IKernelChangedArgs | null = null;
        const object = {};
        await defaultSession.kernel?.requestKernelInfo();
        defaultSession.kernelChanged.connect((s, args) => {
          called = args;
          Signal.disconnectReceiver(object);
        }, object);
        const original = defaultSession.kernel!;
        // Create a new kernel with the same kernel name (same type)
        await defaultSession.changeKernel({ name: original.name });
        expect(original).to.not.equal(defaultSession.kernel);
        expect(called).to.deep.equal({
          name: 'kernel',
          oldValue: original,
          newValue: defaultSession.kernel
        });
        original.dispose();
      });
    });

    describe('#statusChanged', () => {
      it('should emit when the kernel status changes', async () => {
        let called = false;
        defaultSession.statusChanged.connect((s, status) => {
          if (status === 'busy') {
            called = true;
          }
        });
        await defaultSession.kernel!.requestKernelInfo();
        expect(called).to.equal(true);
      });
    });

    describe('#iopubMessage', () => {
      it('should be emitted for an iopub message', async () => {
        let called = false;
        defaultSession.iopubMessage.connect((s, msg) => {
          if (msg.header.msg_type === 'status') {
            called = true;
          }
        });
        await defaultSession.kernel!.requestExecute({ code: 'a=1' }, true).done;
        expect(called).to.equal(true);
      });
    });

    describe('#unhandledMessage', () => {
      it('should be emitted for an unhandled message', async () => {
        const tester = new SessionTester();
        const session = await tester.startSession();
        const msgId = UUID.uuid4();
        const emission = testEmission(session.unhandledMessage, {
          find: (k, msg) => msg.header.msg_id === msgId
        });
        const msg = KernelMessage.createMessage({
          msgType: 'kernel_info_request',
          channel: 'shell',
          session: tester.serverSessionId,
          msgId,
          content: {}
        });
        msg.parent_header = { session: session.kernel!.clientId };
        tester.send(msg);
        await emission;
        await tester.shutdown();
        tester.dispose();
      });
    });

    describe('#propertyChanged', () => {
      it('should be emitted when the session path changes', async () => {
        const newPath = UUID.uuid4();
        let called = false;
        const object = {};
        defaultSession.propertyChanged.connect((s, type) => {
          expect(defaultSession.path).to.equal(newPath);
          expect(type).to.equal('path');
          called = true;
          Signal.disconnectReceiver(object);
        }, object);
        await defaultSession.setPath(newPath);
        expect(called).to.equal(true);
      });
    });

    describe('#id', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.id).to.equal('string');
      });
    });

    describe('#path', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.path).to.equal('string');
      });
    });

    describe('#name', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.name).to.equal('string');
      });
    });

    describe('#type', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.name).to.equal('string');
      });
    });

    describe('#model', () => {
      it('should be an IModel', () => {
        const model = defaultSession.model;
        expect(typeof model.id).to.equal('string');
        expect(typeof model.path).to.equal('string');
        expect(typeof model.kernel!.name).to.equal('string');
        expect(typeof model.kernel!.id).to.equal('string');
      });
    });

    describe('#kernel', () => {
      it('should be an IKernel object', () => {
        expect(typeof defaultSession.kernel!.id).to.equal('string');
      });
    });

    describe('#serverSettings', () => {
      it('should be the serverSettings', () => {
        expect(defaultSession.serverSettings.baseUrl).to.equal(
          PageConfig.getBaseUrl()
        );
      });
    });

    describe('#isDisposed', () => {
      it('should be true after we dispose of the session', async () => {
        const session = await startNew();
        expect(session.isDisposed).to.equal(false);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', async () => {
        const session = await startNew();
        expect(session.isDisposed).to.equal(false);
        expect(session.isDisposed).to.equal(false);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        expect(session.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the session', async () => {
        const session = await startNew();
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });

      it('should be safe to call twice', async () => {
        const session = await startNew();
        session.dispose();
        expect(session.isDisposed).to.equal(true);
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });

      it('should be safe to call if the kernel is disposed', async () => {
        const session = await startNew();
        session.kernel!.dispose();
        session.dispose();
        expect(session.isDisposed).to.equal(true);
      });
    });

    describe('#setPath()', () => {
      it('should set the path of the session', async () => {
        const newPath = UUID.uuid4();
        await defaultSession.setPath(newPath);
        expect(defaultSession.path).to.equal(newPath);
      });

      it('should fail for improper response status', async () => {
        handleRequest(defaultSession, 201, {});
        await expectFailure(defaultSession.setPath(UUID.uuid4()));
      });

      it('should fail for error response status', async () => {
        handleRequest(defaultSession, 500, {});
        await expectFailure(defaultSession.setPath(UUID.uuid4()), '');
      });

      it('should fail for improper model', async () => {
        handleRequest(defaultSession, 200, {});
        await expectFailure(defaultSession.setPath(UUID.uuid4()));
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expectFailure(promise, 'Session is disposed');
      });
    });

    describe('#setType()', () => {
      it('should set the type of the session', async () => {
        const session = await startNew();
        const type = UUID.uuid4();
        await session.setType(type);
        expect(session.type).to.equal(type);
        await session.shutdown();
      });

      it('should fail for improper response status', async () => {
        handleRequest(defaultSession, 201, {});
        await expectFailure(defaultSession.setType(UUID.uuid4()));
      });

      it('should fail for error response status', async () => {
        handleRequest(defaultSession, 500, {});
        await expectFailure(defaultSession.setType(UUID.uuid4()), '');
      });

      it('should fail for improper model', async () => {
        handleRequest(defaultSession, 200, {});
        await expectFailure(defaultSession.setType(UUID.uuid4()));
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expectFailure(promise, 'Session is disposed');
      });
    });

    describe('#setName()', () => {
      it('should set the name of the session', async () => {
        const name = UUID.uuid4();
        await defaultSession.setName(name);
        expect(defaultSession.name).to.equal(name);
      });

      it('should fail for improper response status', async () => {
        handleRequest(defaultSession, 201, {});
        await expectFailure(defaultSession.setName(UUID.uuid4()));
      });

      it('should fail for error response status', async () => {
        handleRequest(defaultSession, 500, {});
        await expectFailure(defaultSession.setName(UUID.uuid4()), '');
      });

      it('should fail for improper model', async () => {
        handleRequest(defaultSession, 200, {});
        await expectFailure(defaultSession.setName(UUID.uuid4()));
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expectFailure(promise, 'Session is disposed');
      });
    });

    describe('#changeKernel()', () => {
      it('should create a new kernel with the new name', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        await session.changeKernel({ name: previous.name });
        expect(session.kernel!.name).to.equal(previous.name);
        expect(session.kernel!.id).to.not.equal(previous.id);
        expect(session.kernel).to.not.equal(previous);
        previous.dispose();
      });

      it('should accept the id of the new kernel', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        const kernel = await KernelAPI.startNew();
        await session.changeKernel({ id: kernel.id });
        expect(session.kernel!.id).to.equal(kernel.id);
        expect(session.kernel).to.not.equal(previous);
        expect(session.kernel).to.not.equal(kernel);
        previous.dispose();
        await KernelAPI.shutdownKernel(kernel.id);
      });

      it('should update the session path if it has changed', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        const model = { ...session.model, path: 'foo.ipynb' };
        handleRequest(session, 200, model);
        await session.changeKernel({ name: previous.name });
        expect(session.kernel!.name).to.equal(previous.name);
        expect(session.path).to.equal(model.path);
        previous.dispose();
      });
    });

    describe('#shutdown()', () => {
      it('should shut down properly', async () => {
        session = await startNew();
        await session.shutdown();
      });

      it('should emit a disposed signal', async () => {
        let called = false;
        session = await startNew();
        session.disposed.connect(() => {
          called = true;
        });
        await session.shutdown();
        expect(called).to.equal(true);
      });

      it('should fail for an incorrect response status', async () => {
        handleRequest(defaultSession, 200, {});
        await expectFailure(defaultSession.shutdown());
      });

      it('should handle a 404 status', async () => {
        session = await startNew();
        handleRequest(session, 404, {});
        await session.shutdown();
      });

      it('should handle a specific error status', async () => {
        handleRequest(defaultSession, 410, {});
        let promise = defaultSession.shutdown();
        try {
          await promise;
          throw Error('should not get here');
        } catch (err) {
          const text = 'The kernel was deleted but the session was not';
          expect(err.message).to.contain(text);
        }
      });

      it('should fail for an error response status', async () => {
        handleRequest(defaultSession, 500, {});
        await expectFailure(defaultSession.shutdown(), '');
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        await expectFailure(session.shutdown(), 'Session is disposed');
      });
    });
  });
});
