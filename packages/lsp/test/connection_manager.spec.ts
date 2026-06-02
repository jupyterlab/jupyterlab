/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  DocumentConnectionManager,
  LanguageServerManager,
  VirtualDocument,
  WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import type { ILanguageServerProvider } from '@jupyterlab/lsp';
import { LabShell } from '@jupyterlab/application';
import { ServerConnection } from '@jupyterlab/services';
import { LSPConnection } from '../lib/connection';

jest.mock('@jupyterlab/notebook');

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
  describe('LSPConnection', () => {
    let manager: DocumentConnectionManager;
    let languageServerManager: LanguageServerManager;
    let document: VirtualDocument;
    beforeEach(() => {
      languageServerManager = new LanguageServerManager({});
      manager = new DocumentConnectionManager({
        languageServerManager,
        adapterTracker: new WidgetLSPAdapterTracker({
          shell: new LabShell()
        })
      });
      document = new VirtualDocument({
        language: 'python',
        path: 'test.ipynb',
        foreignCodeExtractors: null as any,
        standalone: false,
        fileExtension: 'py',
        hasLspSupportedFile: false
      });
    });
    describe('#connectDocumentSignals', () => {
      it('should connect virtual document signals', () => {
        const cb = jest.fn();
        manager.documentsChanged.connect(cb);
        manager.connectDocumentSignals(document);
        expect(manager.documents.has(document.uri)).toEqual(true);
        expect(cb).toHaveBeenCalled();
      });
    });
    describe('#disconnectDocumentSignals', () => {
      it('should disconnect virtual document signals', () => {
        manager.connectDocumentSignals(document);
        expect(manager.documents.has(document.uri)).toEqual(true);
        manager.disconnectDocumentSignals(document);
        expect(manager.documents.has(document.uri)).toEqual(false);
      });
    });
    describe('#onForeignDocumentClosed', () => {
      it('should unregister and disconnect document', () => {
        manager.unregisterDocument = jest.fn();
        manager.disconnectDocumentSignals = jest.fn();
        manager.onForeignDocumentClosed(null as any, {
          foreignDocument: document,
          parentHost: document
        });
        expect(manager.unregisterDocument).toHaveBeenCalled();
        expect(manager.disconnectDocumentSignals).toHaveBeenCalled();
      });
    });
    describe('#connect()', () => {
      it('should use provider transport when available', async () => {
        /* eslint-disable camelcase */
        const runtimeSpec = {
          argv: [''],
          display_name: 'pyright',
          env: {},
          languages: ['python'],
          mime_types: ['text/python'],
          version: 2
        };
        const runtimeSpecs = {
          pyright: runtimeSpec
        };
        const runtimeSessions = {
          pyright: {
            handler_count: 0,
            last_handler_message_at: null,
            last_server_message_at: null,
            spec: runtimeSpec,
            status: 'started'
          }
        };
        /* eslint-enable camelcase */
        const socket = { close: jest.fn() } as any as WebSocket;
        const transportFactory = jest.fn(
          (_options: ILanguageServerProvider.ITransportOptions) => socket
        );
        const provider: ILanguageServerProvider = {
          fetch: async () => ({
            sessions: runtimeSessions as any,
            specs: runtimeSpecs as any,
            transport: { pyright: transportFactory }
          })
        };
        const connectSpy = jest
          .spyOn(LSPConnection.prototype, 'connect')
          .mockImplementation(function (
            this: LSPConnection,
            socket: WebSocket
          ): void {
            (this as any).socket = socket;
            (this as any).connection = { dispose: jest.fn() };
            (this as any)._isConnected = true;
            (this as any)._isInitialized = true;
          });

        languageServerManager.setConfiguration({
          pyright: { rank: 100 }
        } as any);
        languageServerManager.registerProvider(provider);
        await languageServerManager.fetchSessions();
        await manager.connect({
          capabilities: {},
          hasLspSupportedFile: false,
          language: 'python',
          virtualDocument: document
        });

        expect(transportFactory).toHaveBeenCalledWith(
          expect.objectContaining({
            languageServerId: 'pyright',
            settings: languageServerManager.settings
          })
        );
        expect(transportFactory.mock.calls[0][0].socketUrl).toContain(
          'lsp/ws/pyright'
        );
        expect(connectSpy).toHaveBeenCalledWith(socket);

        manager.disconnect('pyright' as any);
        connectSpy.mockRestore();
      });
    });
    describe('#dispose()', () => {
      it('should dispose of an uninitialized connection without errors', () => {
        const connection = new LSPConnection({
          capabilities: {},
          languageId: '',
          rootUri: '',
          serverUri: ''
        });
        connection.dispose();
        expect(connection.isDisposed).toBe(true);
      });
    });
  });
});
