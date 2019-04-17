// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { toArray } from '@phosphor/algorithm';

import { ServerConnection } from '@jupyterlab/services';

import { Session } from '@jupyterlab/services';

import {
  expectFailure,
  makeSettings,
  SessionTester,
  createSessionModel,
  getRequestHandler,
  init
} from '../utils';

init();

/**
 * Create session options based on a sessionModel.
 */
function createSessionOptions(
  sessionModel: Session.IModel,
  serverSettings: ServerConnection.ISettings
): Session.IOptions {
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
  return Session.startNew({ path: UUID.uuid4() });
}

describe('session', () => {
  let session: Session.ISession;
  let defaultSession: Session.ISession;

  beforeAll(async () => {
    defaultSession = await startNew();
    await defaultSession.kernel.ready;
  });

  afterEach(async () => {
    if (session && !session.isDisposed) {
      await session.kernel.ready;
      await session.shutdown();
    }
  });

  afterAll(async () => {
    await defaultSession.kernel.ready;
    await defaultSession.shutdown();
  });

  describe('Session.listRunning()', () => {
    it('should yield a list of valid session models', async () => {
      const response = await Session.listRunning();
      const running = toArray(response);
      expect(running.length).to.greaterThan(0);
    });

    it('should throw an error for an invalid model', async () => {
      const data = { id: '1234', path: 'test' };
      const serverSettings = getRequestHandler(200, data);
      const list = Session.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should throw an error for another invalid model', async () => {
      const data = [{ id: '1234', kernel: { id: '', name: '' }, path: '' }];
      const serverSettings = getRequestHandler(200, data);
      const list = Session.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should fail for wrong response status', async () => {
      const serverSettings = getRequestHandler(201, [createSessionModel()]);
      const list = Session.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      const list = Session.listRunning(serverSettings);
      await expectFailure(list, '');
    });
  });

  describe('Session.startNew', () => {
    it('should start a session', async () => {
      session = await startNew();
      expect(session.id).to.be.ok;
    });

    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      const options: Session.IOptions = { path: UUID.uuid4(), serverSettings };
      session = await Session.startNew(options);
      expect(session.id).to.be.ok;
    });

    it('should start even if the websocket fails', async () => {
      const tester = new SessionTester();
      tester.initialStatus = 'dead';
      await tester.startSession();
      tester.dispose();
    });

    it('should fail for wrong response status', async () => {
      const sessionModel = createSessionModel();
      const serverSettings = getRequestHandler(200, sessionModel);
      const options = createSessionOptions(sessionModel, serverSettings);
      const sessionPromise = Session.startNew(options);
      await expectFailure(sessionPromise);
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      const sessionModel = createSessionModel();
      const options = createSessionOptions(sessionModel, serverSettings);
      const sessionPromise = Session.startNew(options);
      await expectFailure(sessionPromise, '');
    });

    it('should fail for wrong response model', async () => {
      const sessionModel = createSessionModel();
      (sessionModel as any).path = 1;
      const serverSettings = getRequestHandler(201, sessionModel);
      const options = createSessionOptions(sessionModel, serverSettings);
      const sessionPromise = Session.startNew(options);
      const msg = `Property 'path' is not of type 'string'`;
      await expectFailure(sessionPromise, msg);
    });

    it('should handle a deprecated response model', async () => {
      const sessionModel = createSessionModel();
      const data = {
        id: sessionModel.id,
        kernel: sessionModel.kernel,
        notebook: { path: sessionModel.path }
      };
      const serverSettings = getRequestHandler(201, data);
      const options = createSessionOptions(sessionModel, serverSettings);
      const model = await Session.startNew(options);
      expect(model.path).not.empty;
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
      const newSession = Session.connectTo(defaultSession.model);
      expect(newSession.id).to.equal(defaultSession.id);
      expect(newSession.kernel.id).to.equal(defaultSession.kernel.id);
      expect(newSession).to.not.equal(defaultSession);
      expect(newSession.kernel).to.not.equal(defaultSession.kernel);
    });

    it('should accept server settings', () => {
      const serverSettings = makeSettings();
      const session = Session.connectTo(defaultSession.model, serverSettings);
      expect(session.id).to.be.ok;
    });
  });

  describe('Session.shutdown()', () => {
    it('should shut down a kernel by id', async () => {
      session = await startNew();
      await session.kernel.ready;
      await Session.shutdown(session.id);
    });

    it('should handle a 404 status', () => {
      return Session.shutdown(UUID.uuid4());
    });
  });
});
