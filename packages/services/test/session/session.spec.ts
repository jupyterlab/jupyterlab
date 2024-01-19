// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import { Session, SessionAPI } from '../../src';
import { createSessionModel, getRequestHandler, makeSettings } from '../utils';

describe('session', () => {
  let session: Session.IModel;
  let server: JupyterServer;

  jest.retryTimes(3);

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
    const sessions = await SessionAPI.listRunning();
    await Promise.all(sessions.map(s => SessionAPI.shutdownSession(s.id)));
  }, 30000);

  afterAll(async () => {
    await server.shutdown();
  });

  afterEach(async () => {
    const sessions = await SessionAPI.listRunning();
    await Promise.all(sessions.map(s => SessionAPI.shutdownSession(s.id)));
  });

  describe('Session.listRunning()', () => {
    it('should yield a list of valid session models', async () => {
      expect(Array.from(await SessionAPI.listRunning()).length).toBe(0);
      const session = await SessionAPI.startSession({
        name: UUID.uuid4(),
        path: UUID.uuid4(),
        type: 'test'
      });
      expect(Array.from(await SessionAPI.listRunning())).toEqual([session]);
    });

    it('should throw an error for an invalid model', async () => {
      const data = { id: '1234', path: 'test' };
      const serverSettings = getRequestHandler(200, data);
      await expect(SessionAPI.listRunning(serverSettings)).rejects.toThrow();
    });

    it('should throw an error for another invalid model', async () => {
      const data = [{ id: '1234', kernel: { id: '', name: '' }, path: '' }];
      const serverSettings = getRequestHandler(200, data);
      await expect(SessionAPI.listRunning(serverSettings)).rejects.toThrow();
    });

    it('should fail for wrong response status', async () => {
      const serverSettings = getRequestHandler(201, [createSessionModel()]);
      await expect(SessionAPI.listRunning(serverSettings)).rejects.toThrow();
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      await expect(SessionAPI.listRunning(serverSettings)).rejects.toThrow();
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
      await expect(
        SessionAPI.startSession(sessionModel as any, serverSettings)
      ).rejects.toThrow();
    });

    it('should fail for error response status', async () => {
      const serverSettings = getRequestHandler(500, {});
      const sessionModel = createSessionModel();
      await expect(
        SessionAPI.startSession(sessionModel as any, serverSettings)
      ).rejects.toThrow();
    });

    it('should fail for wrong response model', async () => {
      const sessionModel = createSessionModel();
      (sessionModel as any).path = 1;
      const serverSettings = getRequestHandler(201, sessionModel);
      await expect(
        SessionAPI.startSession(sessionModel as any, serverSettings)
      ).rejects.toThrow(/Property 'path' is not of type 'string'/);
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
      await expect(
        SessionAPI.shutdownSession(session.id)
      ).resolves.not.toThrow();
    });

    it('should handle a 404 status', async () => {
      await expect(
        SessionAPI.shutdownSession(UUID.uuid4())
      ).resolves.not.toThrow();
    });

    it('should reject invalid on invalid id', async () => {
      await expect(SessionAPI.shutdownSession('../')).rejects.toThrow();
    });
  });
});
