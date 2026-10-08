/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { LanguageServerManager } from '@jupyterlab/lsp';
import type { ILanguageServerProvider } from '@jupyterlab/lsp';
import { ServerConnection } from '@jupyterlab/services';
import { Signal } from '@lumino/signaling';

const spy = jest.spyOn(ServerConnection, 'makeRequest');
const specs = {
  /* eslint-disable */
  pyls: {
    argv: [''],
    display_name: 'pyls',
    env: {},
    languages: ['python'],
    mime_types: ['text/python', 'text/x-ipython'],
    version: 2
  }
  /* eslint-enable  */
};
const sessions = {
  /* eslint-disable */
  pyls: {
    handler_count: 0,
    last_handler_message_at: null,
    last_server_message_at: null,
    spec: specs.pyls,
    status: 'not_started'
  }
  /* eslint-enable  */
};
const runtimeSpecs = {
  /* eslint-disable */
  pyright: {
    argv: [''],
    display_name: 'pyright',
    env: {},
    languages: ['python'],
    mime_types: ['text/python'],
    version: 2
  }
  /* eslint-enable  */
};
const runtimeSessions = {
  /* eslint-disable */
  pyright: {
    handler_count: 0,
    last_handler_message_at: null,
    last_server_message_at: null,
    spec: runtimeSpecs.pyright,
    status: 'started'
  }
  /* eslint-enable  */
};
spy.mockImplementation((status, method, setting) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => ({
      sessions,
      specs,
      version: 2
    })
  }) as any;
});
describe('@jupyterlab/lsp', () => {
  describe('LanguageServerManager', () => {
    let manager: LanguageServerManager;
    beforeEach(() => {
      manager = new LanguageServerManager({});
    });
    describe('#fetchSessions', () => {
      it('should fetch session from server', async () => {
        await manager.fetchSessions();
        expect(manager.sessions.has('pyls' as any)).toEqual(true);
        expect(manager.specs.has('pyls' as any)).toEqual(true);
      });

      it('should merge runtime provider sessions and specs', async () => {
        const provider: ILanguageServerProvider = {
          id: 'test-provider',
          fetch: async () => ({
            sessions: runtimeSessions as any,
            specs: runtimeSpecs as any
          })
        };

        manager.registerProvider(provider);
        await manager.fetchSessions();

        expect(manager.sessions.has('pyright' as any)).toEqual(true);
        expect(manager.specs.has('pyright' as any)).toEqual(true);
      });

      it('should remove provider sessions and specs after disposal', async () => {
        const provider: ILanguageServerProvider = {
          id: 'test-provider',
          fetch: async () => ({
            sessions: runtimeSessions as any,
            specs: runtimeSpecs as any
          })
        };

        const disposable = manager.registerProvider(provider);
        await manager.fetchSessions();
        expect(manager.sessions.has('pyright' as any)).toEqual(true);

        disposable.dispose();
        await manager.fetchSessions();

        expect(manager.sessions.has('pyright' as any)).toEqual(false);
        expect(manager.specs.has('pyright' as any)).toEqual(false);
      });

      it('should refresh when provider emits sessionsChanged', async () => {
        let active = false;
        const provider = {
          id: 'test-provider',
          fetch: async () => ({
            sessions: active ? (runtimeSessions as any) : {},
            specs: active ? (runtimeSpecs as any) : {}
          })
        } as ILanguageServerProvider;
        const sessionsChanged = new Signal<ILanguageServerProvider, void>(
          provider
        );
        (provider as any).sessionsChanged = sessionsChanged;

        manager.registerProvider(provider);
        await manager.fetchSessions();
        expect(manager.sessions.has('pyright' as any)).toEqual(false);

        active = true;
        sessionsChanged.emit(void 0);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(manager.sessions.has('pyright' as any)).toEqual(true);
        expect(manager.specs.has('pyright' as any)).toEqual(true);
      });

      it('should preserve previous sessions/specs on malformed server payload', async () => {
        await manager.fetchSessions();
        expect(manager.sessions.has('pyls' as any)).toEqual(true);

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        spy.mockImplementationOnce((status, method, setting) => {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => {
              throw new Error('malformed');
            }
          }) as any;
        });
        await manager.fetchSessions();

        expect(manager.sessions.has('pyls' as any)).toEqual(true);
        expect(manager.specs.has('pyls' as any)).toEqual(true);
        warnSpy.mockRestore();
      });

      it('should fetch providers when the server request rejects', async () => {
        const defaultImplementation = spy.getMockImplementation();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        spy.mockImplementation(() => {
          return Promise.reject(new Error('offline'));
        });

        const provider: ILanguageServerProvider = {
          id: 'test-provider',
          fetch: async () => ({
            sessions: runtimeSessions as any,
            specs: runtimeSpecs as any
          })
        };

        manager.registerProvider(provider);
        await manager.fetchSessions();

        expect(manager.sessions.has('pyright' as any)).toEqual(true);
        expect(manager.specs.has('pyright' as any)).toEqual(true);

        spy.mockImplementation(defaultImplementation!);
        warnSpy.mockRestore();
      });

      it('should not register the same provider id twice', async () => {
        const firstProvider: ILanguageServerProvider = {
          id: 'test-provider',
          fetch: async () => ({
            sessions: runtimeSessions as any,
            specs: runtimeSpecs as any
          })
        };
        const secondProvider: ILanguageServerProvider = {
          id: 'test-provider',
          fetch: jest.fn(async () => ({
            sessions: {},
            specs: {}
          }))
        };
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        manager.registerProvider(firstProvider);
        const duplicateDisposable = manager.registerProvider(secondProvider);
        await manager.fetchSessions();
        duplicateDisposable.dispose();

        expect(manager.sessions.has('pyright' as any)).toEqual(true);
        expect(secondProvider.fetch).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenLastCalledWith(
          expect.stringContaining(
            'Language server provider with id test-provider is already registered'
          )
        );

        warnSpy.mockRestore();
      });

      it('should not expose stale server sessions or specs after disable', async () => {
        await manager.fetchSessions();
        expect(manager.sessions.has('pyls' as any)).toEqual(true);

        const defaultImplementation = spy.getMockImplementation();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        manager.disable();
        expect(manager.sessions.has('pyls' as any)).toEqual(false);
        expect(manager.specs.has('pyls' as any)).toEqual(false);
        spy.mockImplementation((status, method, setting) => {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => {
              throw new Error('malformed');
            }
          }) as any;
        });

        await manager.enable();

        expect(manager.sessions.has('pyls' as any)).toEqual(false);
        expect(manager.specs.has('pyls' as any)).toEqual(false);

        spy.mockImplementation(defaultImplementation!);
        warnSpy.mockRestore();
      });

      it('should update status code when retry is scheduled', async () => {
        spy.mockImplementationOnce((status, method, setting) => {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () => ({})
          }) as any;
        });
        const setTimeoutSpy = jest
          .spyOn(global, 'setTimeout')
          .mockImplementation(((
            _callback: (...args: any[]) => void,
            _ms?: number
          ) => {
            return 0 as any;
          }) as any);
        const retryManager = new LanguageServerManager({
          retries: 1,
          retriesInterval: 1
        });
        await Promise.resolve();
        await Promise.resolve();

        expect(retryManager.statusCode).toEqual(503);
        setTimeoutSpy.mockRestore();
      });
    });

    describe('#compareRanks', () => {
      it('should raise warning if two server have the same rank', async () => {
        console.warn = jest.fn();
        const value = manager['compareRanks'](
          'pylsp',
          'unified-language-server'
        );
        expect((console.warn as jest.Mock).mock.calls[0][0]).toEqual(
          'Two matching servers: pylsp and unified-language-server have the same rank; choose which one to use by changing the rank in Advanced Settings Editor'
        );
        expect(value).toEqual(-1);
      });
    });
    describe('#getMatchingServers', () => {
      it('should get the matching server', async () => {
        const match = manager.getMatchingServers({
          language: 'python',
          mimeType: 'text/python'
        });
        expect(match).toEqual(['pyls']);
      });
    });
    describe('#getMatchingSpecs', () => {
      it('should get the matching spec', async () => {
        const match = manager.getMatchingSpecs({
          language: 'python',
          mimeType: 'text/python'
        });
        expect(match.has('pyls' as any)).toEqual(true);
      });
    });
    describe('#statusUrl', () => {
      it('should use baseUrl from server settings when no baseUrl override is provided', () => {
        const customBaseUrl = 'http://custom-server:8888';
        const customSettings = ServerConnection.makeSettings({
          baseUrl: customBaseUrl
        });

        const customManager = new LanguageServerManager({
          settings: customSettings
        });

        expect(customManager.statusUrl).toContain(customBaseUrl);
        expect(customManager.statusUrl).toContain('lsp/status');
      });

      it('should prefer baseUrl override over server settings baseUrl', () => {
        const serverBaseUrl = 'http://server:8888';
        const overrideBaseUrl = 'http://override:9999';
        const customSettings = ServerConnection.makeSettings({
          baseUrl: serverBaseUrl
        });

        const customManager = new LanguageServerManager({
          settings: customSettings,
          baseUrl: overrideBaseUrl
        });

        expect(customManager.statusUrl).toContain(overrideBaseUrl);
        expect(customManager.statusUrl).not.toContain(serverBaseUrl);
        expect(customManager.statusUrl).toContain('lsp/status');
      });
    });
  });
});
