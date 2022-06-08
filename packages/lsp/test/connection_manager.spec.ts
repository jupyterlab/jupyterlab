import {
  DocumentConnectionManager,
  LanguageServerManager,
  VirtualDocument
} from '@jupyterlab/lsp';
import { ServerConnection } from '@jupyterlab/services';

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
    let document: VirtualDocument;
    beforeEach(() => {
      manager = new DocumentConnectionManager({
        languageServerManager: new LanguageServerManager({})
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
        manager.documentsChanged.emit = jest.fn();
        manager.connectDocumentSignals(document);
        expect(manager.documents.has(document.uri)).toEqual(true);
        expect(manager.documentsChanged.emit).toBeCalled();
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
        expect(manager.unregisterDocument).toBeCalled();
        expect(manager.disconnectDocumentSignals).toBeCalled();
      });
    });
  });
});
