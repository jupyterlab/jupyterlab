// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { JupyterServer, sleep, testEmission } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import {
  KernelAPI,
  KernelManager,
  KernelMessage,
  ServerConnection,
  Session,
  SessionAPI,
  SessionManager
} from '../../src';
import { handleRequest, SessionTester } from '../utils';

let kernelManager: KernelManager;
let sessionManager: SessionManager;

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
  let sessionAPIClient: Session.ISessionAPIClient;
  let defaultSession: Session.ISessionConnection;
  let server: JupyterServer;

  jest.retryTimes(3);

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
    kernelManager = new KernelManager();
    const serverSettings = ServerConnection.makeSettings();
    sessionAPIClient = new SessionAPI.SessionAPIClient({ serverSettings });
    sessionManager = new SessionManager({ kernelManager, sessionAPIClient });
    defaultSession = await startNew();
  }, 30000);

  afterEach(async () => {
    if (session && !session.isDisposed) {
      await session.shutdown();
    }
  });

  afterAll(async () => {
    await defaultSession.shutdown();
    await server.shutdown();
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
        expect(called).toBe(true);
      });
    });

    describe('#kernelChanged', () => {
      it('should emit when the kernel changes', async () => {
        let called: Session.ISessionConnection.IKernelChangedArgs | null = null;
        const object = {};
        while (defaultSession.kernel!.connectionStatus !== 'connected') {
          await sleep(100);
        }
        await defaultSession.kernel!.requestKernelInfo();
        defaultSession.kernelChanged.connect((s, args) => {
          called = args;
          Signal.disconnectReceiver(object);
        }, object);
        const original = defaultSession.kernel!;
        // Create a new kernel with the same kernel name (same type)
        await defaultSession.changeKernel({ name: original.name });
        expect(original).not.toBe(defaultSession.kernel);
        expect(called).toEqual({
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
        while (defaultSession.kernel!.connectionStatus !== 'connected') {
          await sleep(100);
        }
        await defaultSession.kernel!.requestKernelInfo();
        expect(called).toBe(true);
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
        expect(called).toBe(true);
      });
    });

    describe('#unhandledMessage', () => {
      let tester: SessionTester;

      beforeEach(() => {
        tester = new SessionTester();
      });

      afterEach(() => {
        tester.dispose();
      });

      it('should be emitted for an unhandled message', async () => {
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
        msg.parent_header = { session: session.kernel!.clientId } as any;
        tester.send(msg);
        await emission;
        await expect(tester.shutdown()).resolves.not.toThrow();
      });
    });

    describe('#propertyChanged', () => {
      it('should be emitted when the session path changes', async () => {
        const newPath = UUID.uuid4();
        let called = false;
        const object = {};
        defaultSession.propertyChanged.connect((s, type) => {
          expect(defaultSession.path).toBe(newPath);
          expect(type).toBe('path');
          called = true;
          Signal.disconnectReceiver(object);
        }, object);
        await defaultSession.setPath(newPath);
        expect(called).toBe(true);
      });
    });

    describe('#id', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.id).toBe('string');
      });
    });

    describe('#path', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.path).toBe('string');
      });
    });

    describe('#name', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.name).toBe('string');
      });
    });

    describe('#type', () => {
      it('should be a string', () => {
        expect(typeof defaultSession.name).toBe('string');
      });
    });

    describe('#model', () => {
      it('should be an IModel', () => {
        const model = defaultSession.model;
        expect(typeof model.id).toBe('string');
        expect(typeof model.path).toBe('string');
        expect(typeof model.kernel!.name).toBe('string');
        expect(typeof model.kernel!.id).toBe('string');
      });
    });

    describe('#kernel', () => {
      it('should be an IKernel object', () => {
        expect(typeof defaultSession.kernel!.id).toBe('string');
      });
    });

    describe('#serverSettings', () => {
      it('should be the serverSettings', () => {
        expect(defaultSession.serverSettings.baseUrl).toBe(
          PageConfig.getBaseUrl()
        );
      });
    });

    describe('#isDisposed', () => {
      it('should be true after we dispose of the session', async () => {
        const session = await startNew();
        expect(session.isDisposed).toBe(false);
        session.dispose();
        expect(session.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', async () => {
        const session = await startNew();
        expect(session.isDisposed).toBe(false);
        expect(session.isDisposed).toBe(false);
        session.dispose();
        expect(session.isDisposed).toBe(true);
        expect(session.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the session', async () => {
        const session = await startNew();
        session.dispose();
        expect(session.isDisposed).toBe(true);
      });

      it('should be safe to call twice', async () => {
        const session = await startNew();
        session.dispose();
        expect(session.isDisposed).toBe(true);
        session.dispose();
        expect(session.isDisposed).toBe(true);
      });

      it('should be safe to call if the kernel is disposed', async () => {
        const session = await startNew();
        session.kernel!.dispose();
        session.dispose();
        expect(session.isDisposed).toBe(true);
      });
    });

    describe('#setPath()', () => {
      it('should set the path of the session', async () => {
        const newPath = UUID.uuid4();
        await defaultSession.setPath(newPath);
        expect(defaultSession.path).toBe(newPath);
      });

      it('should fail for improper response status', async () => {
        handleRequest(sessionAPIClient, 201, {});
        await expect(defaultSession.setPath(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for error response status', async () => {
        handleRequest(sessionAPIClient, 500, {});
        await expect(defaultSession.setPath(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for improper model', async () => {
        handleRequest(sessionAPIClient, 200, {});
        await expect(defaultSession.setPath(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expect(promise).rejects.toThrow(/Session is disposed/);
      });
    });

    describe('#setType()', () => {
      it('should set the type of the session', async () => {
        const session = await startNew();
        const type = UUID.uuid4();
        await session.setType(type);
        expect(session.type).toBe(type);
        await session.shutdown();
      });

      it('should fail for improper response status', async () => {
        handleRequest(sessionAPIClient, 201, {});
        await expect(defaultSession.setType(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for error response status', async () => {
        handleRequest(sessionAPIClient, 500, {});
        await expect(defaultSession.setType(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for improper model', async () => {
        handleRequest(sessionAPIClient, 200, {});
        await expect(defaultSession.setType(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expect(promise).rejects.toThrow(/Session is disposed/);
      });
    });

    describe('#setName()', () => {
      it('should set the name of the session', async () => {
        const name = UUID.uuid4();
        await defaultSession.setName(name);
        expect(defaultSession.name).toBe(name);
      });

      it('should fail for improper response status', async () => {
        handleRequest(sessionAPIClient, 201, {});
        await expect(defaultSession.setName(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for error response status', async () => {
        handleRequest(sessionAPIClient, 500, {});
        await expect(defaultSession.setName(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail for improper model', async () => {
        handleRequest(sessionAPIClient, 200, {});
        await expect(defaultSession.setName(UUID.uuid4())).rejects.toThrow();
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        const promise = session.setPath(UUID.uuid4());
        await expect(promise).rejects.toThrow(/Session is disposed/);
      });
    });

    describe('#changeKernel()', () => {
      it('should create a new kernel with the new name', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        await session.changeKernel({ name: previous.name });
        expect(session.kernel!.name).toBe(previous.name);
        expect(session.kernel!.id).not.toBe(previous.id);
        expect(session.kernel).not.toBe(previous);
        previous.dispose();
      });

      it('should accept the id of the new kernel', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        const kernel = await KernelAPI.startNew();
        await session.changeKernel({ id: kernel.id });
        expect(session.kernel!.id).toBe(kernel.id);
        expect(session.kernel).not.toBe(previous);
        expect(session.kernel).not.toBe(kernel);
        previous.dispose();
      });

      it('should update the session path if it has changed', async () => {
        session = await startNew();
        const previous = session.kernel!;
        await previous.info;
        const path = UUID.uuid4() + '.ipynb';
        const model = { ...session.model, path };
        handleRequest(sessionAPIClient, 200, model);
        await session.changeKernel({ name: previous.name });
        expect(session.kernel!.name).toBe(previous.name);
        expect(session.path).toBe(model.path);
        previous.dispose();
      });
    });

    describe('#shutdown()', () => {
      it('should shut down properly', async () => {
        session = await startNew();
        await expect(session.shutdown()).resolves.not.toThrow();
      });

      it('should emit a disposed signal', async () => {
        let called = false;
        session = await startNew();
        session.disposed.connect(() => {
          called = true;
        });
        await session.shutdown();
        expect(called).toBe(true);
      });

      it('should fail for an incorrect response status', async () => {
        handleRequest(sessionAPIClient, 200, {});
        await expect(defaultSession.shutdown()).rejects.toThrow();
      });

      it('should handle a 404 status', async () => {
        session = await startNew();
        handleRequest(sessionAPIClient, 404, {});
        await expect(session.shutdown()).resolves.not.toThrow();
      });

      it('should handle a specific error status', async () => {
        handleRequest(sessionAPIClient, 410, {});
        const promise = defaultSession.shutdown();
        await expect(promise).rejects.toThrow(
          'The kernel was deleted but the session was not'
        );
      });

      it('should fail for an error response status', async () => {
        handleRequest(sessionAPIClient, 500, {});
        await expect(defaultSession.shutdown()).rejects.toThrow();
      });

      it('should fail if the session is disposed', async () => {
        const session = sessionManager.connectTo({
          model: defaultSession.model
        });
        session.dispose();
        await expect(session.shutdown()).rejects.toThrow(/Session is disposed/);
      });
    });
  });
});
