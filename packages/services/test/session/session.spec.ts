// Copyright (c) Jupyter Development Team.

import 'jest';

import { UUID } from '@lumino/coreutils';

import { toArray } from '@lumino/algorithm';

import { SessionAPI } from '../../src';

import { Session } from '../../src';

import {
  expectFailure,
  JupyterServer,
  flakyIt as it
} from '@jupyterlab/testutils';

import {
  makeSettings,
  createSessionModel,
  getRequestHandler,
  init
} from '../utils';

init();

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('session', () => {
  let session: Session.IModel;

  beforeAll(async () => {
    const sessions = await SessionAPI.listRunning();
    await Promise.all(sessions.map(s => SessionAPI.shutdownSession(s.id)));
  });

  afterEach(async () => {
    const sessions = await SessionAPI.listRunning();
    await Promise.all(sessions.map(s => SessionAPI.shutdownSession(s.id)));
  });

  describe('Session.listRunning()', () => {
    it('should yield a list of valid session models', async () => {
      expect(toArray(await SessionAPI.listRunning()).length).toBe(0);
      const session = await SessionAPI.startSession({
        name: UUID.uuid4(),
        path: UUID.uuid4(),
        type: 'test'
      });
      expect(toArray(await SessionAPI.listRunning())).toEqual([session]);
    });

    it('should throw an error for an invalid model', async () => {
      const data = { id: '1234', path: 'test' };
      const serverSettings = getRequestHandler(200, data);
      const list = SessionAPI.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should throw an error for another invalid model', async () => {
      const data = [{ id: '1234', kernel: { id: '', name: '' }, path: '' }];
      const serverSettings = getRequestHandler(200, data);
      const list = SessionAPI.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should fail for wrong response status', async () => {
      const serverSettings = getRequestHandler(201, [createSessionModel()]);
      const list = SessionAPI.listRunning(serverSettings);
      await expectFailure(list);
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      const list = SessionAPI.listRunning(serverSettings);
      await expectFailure(list, '');
    });
  });

  describe('SessionAPI.startNew', () => {
    it('should start a session', async () => {
      session = await SessionAPI.startSession({
        path: UUID.uuid4(),
        name: UUID.uuid4(),
        type: 'test'
      });
      expect(session.id).toBeTruthy();
    });

    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      session = await SessionAPI.startSession(
        {
          path: UUID.uuid4(),
          name: UUID.uuid4(),
          type: 'test'
        },
        serverSettings
      );
      expect(session.id).toBeTruthy();
    });

    it('should fail for wrong response status', async () => {
      const sessionModel = createSessionModel();
      const serverSettings = getRequestHandler(200, sessionModel);
      const sessionPromise = SessionAPI.startSession(
        sessionModel as any,
        serverSettings
      );
      await expectFailure(sessionPromise);
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      const sessionModel = createSessionModel();
      const sessionPromise = SessionAPI.startSession(
        sessionModel as any,
        serverSettings
      );
      await expectFailure(sessionPromise, '');
    });

    it('should fail for wrong response model', async () => {
      const sessionModel = createSessionModel();
      (sessionModel as any).path = 1;
      const serverSettings = getRequestHandler(201, sessionModel);
      const sessionPromise = SessionAPI.startSession(
        sessionModel as any,
        serverSettings
      );
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
      const model = await SessionAPI.startSession(
        sessionModel as any,
        serverSettings
      );
      expect(model).toHaveProperty('id');
      expect(model.path).toBeTruthy();
    });
  });

  describe('Session.shutdown()', () => {
    it('should shut down a kernel by id', async () => {
      session = await SessionAPI.startSession({
        path: UUID.uuid4(),
        name: UUID.uuid4(),
        type: 'test'
      });
      await SessionAPI.shutdownSession(session.id);
    });

    it('should handle a 404 status', () => {
      return SessionAPI.shutdownSession(UUID.uuid4());
    });
  });
});
