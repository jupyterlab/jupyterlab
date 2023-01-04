// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { PromiseDelegate } from '@lumino/coreutils';
import { EventManager, ServerConnection } from '../../src';

describe('setting', () => {
  let server: JupyterServer;

  beforeAll(async () => {
    server = new JupyterServer();
    await server.start();
  }, 30000);

  afterAll(async () => {
    await server.shutdown();
  });

  describe('EventManager', () => {
    let manager: EventManager;

    beforeEach(() => {
      manager = new EventManager({
        serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
      });
    });

    afterEach(() => {
      manager.dispose();
    });

    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new EventManager();
        expect(manager).toBeInstanceOf(EventManager);
      });

      it('should accept options', () => {
        const manager = new EventManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).toBeInstanceOf(EventManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'http://localhost/foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new EventManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).toBe(baseUrl);
      });
    });

    describe('#stream[Symbol.asyncIterator]()', () => {
      it('should yield an event', async () => {
        const delegate = new PromiseDelegate<void>();
        const expected = `#stream[Symbol.asyncIterator]() test`;
        let received = '';
        setTimeout(async () => {
          for await (const emission of manager.stream) {
            received = (emission.path as string) || '';
            if (received === expected) {
              break;
            }
          }
          expect(received).toEqual(expected);
          delegate.resolve();
        });
        setTimeout(() => {
          void manager.emit({
            // eslint-disable-next-line camelcase
            schema_id:
              'https://events.jupyter.org/jupyter_server/contents_service/v1',
            data: { action: 'get', path: expected },
            version: '1'
          });
        }, 500);
        return delegate.promise;
      });
    });

    describe('#stream.connect()', () => {
      it('should yield an event', async () => {
        const delegate = new PromiseDelegate<void>();
        const expected = `#stream.connect() test`;
        let received = '';
        manager.stream.connect((_, emission) => {
          received = (emission.path as string) || '';
          if (received !== expected) {
            return;
          }
          expect(received).toEqual(expected);
          delegate.resolve();
        });
        setTimeout(() => {
          void manager.emit({
            // eslint-disable-next-line camelcase
            schema_id:
              'https://events.jupyter.org/jupyter_server/contents_service/v1',
            data: { action: 'get', path: expected },
            version: '1'
          });
        }, 500);
        return delegate.promise;
      });
    });

    describe('#emit()', () => {
      it('should emit an event', async () => {
        const delegate = new PromiseDelegate<void>();
        const expected = `#emit() test`;
        let received = '';
        setTimeout(async () => {
          for await (const emission of manager.stream) {
            received = (emission.path as string) || '';
            if (received === expected) {
              break;
            }
          }
          expect(received).toEqual(expected);
          delegate.resolve();
        });
        setTimeout(() => {
          void manager.emit({
            // eslint-disable-next-line camelcase
            schema_id:
              'https://events.jupyter.org/jupyter_server/contents_service/v1',
            data: { action: 'get', path: expected },
            version: '1'
          });
        }, 500);
        return delegate.promise;
      });
    });
  });
});
