// Disclaimer/acknowledgement: Fragments are based on https://github.com/wylieconlon/lsp-editor-adapter,
// which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.

import { ConsoleLogger, listen, MessageConnection } from 'vscode-ws-jsonrpc';

import {
  registerServerCapability,
  unregisterServerCapability
} from './server-capability-registration';
import { IDocumentInfo, ILspConnection, ILspOptions } from './types';

import type * as protocol from 'vscode-languageserver-protocol';

/**
 * Changes as compared to upstream:
 *  - markdown is preferred over plaintext
 *  - informative members are public and others are protected, not private
 *  - onServerInitialized() was extracted; it also emits a message once connected
 *  - initializeParams() was extracted, and can be modified by subclasses
 *  - typescript 3.7 was adopted to clean up deep references
 */
export class LspWsConnection implements ILspConnection {
  constructor(options: ILspOptions) {
    this._rootUri = options.rootUri;
  }

  /**
   * Is the language server is connected?
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Is the language server is initialized?
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Is the language server is connected and initialized?
   */
  get isReady() {
    return this._isConnected && this._isInitialized;
  }

  /**
   * Initialize a connection over a web socket that speaks the LSP protocol
   */
  connect(socket: WebSocket): void {
    this.socket = socket;

    listen({
      webSocket: this.socket,
      logger: new ConsoleLogger(),
      onConnection: (connection: MessageConnection) => {
        connection.listen();
        this._isConnected = true;

        this.connection = connection;
        this.sendInitialize();

        this.connection.onRequest(
          'client/registerCapability',
          (params: protocol.RegistrationParams) => {
            params.registrations.forEach(
              (capabilityRegistration: protocol.Registration) => {
                try {
                  this.serverCapabilities = registerServerCapability(
                    this.serverCapabilities,
                    capabilityRegistration
                  )!;
                } catch (err) {
                  console.error(err);
                }
              }
            );
          }
        );

        this.connection.onRequest(
          'client/unregisterCapability',
          (params: protocol.UnregistrationParams) => {
            params.unregisterations.forEach(
              (capabilityUnregistration: protocol.Unregistration) => {
                this.serverCapabilities = unregisterServerCapability(
                  this.serverCapabilities,
                  capabilityUnregistration
                );
              }
            );
          }
        );

        this.connection.onClose(() => {
          this._isConnected = false;
        });
      }
    });
  }

  /**
   * Close the connection
   */
  close() {
    if (this.connection) {
      this.connection.dispose();
    }
    this.openedUris.clear();
    this.socket.close();
  }

  /**
   * The initialize request telling the server which options the client supports
   */
  sendInitialize() {
    if (!this._isConnected) {
      return;
    }

    this.openedUris.clear();

    const message: protocol.InitializeParams = this.initializeParams();

    this.connection
      .sendRequest<protocol.InitializeResult>('initialize', message)
      .then(
        params => {
          this.onServerInitialized(params);
        },
        e => {
          console.warn('LSP websocket connection initialization failure', e);
        }
      );
  }

  /**
   * Inform the server that the document was opened
   */
  sendOpen(documentInfo: IDocumentInfo) {
    const textDocumentMessage: protocol.DidOpenTextDocumentParams = {
      textDocument: {
        uri: documentInfo.uri,
        languageId: documentInfo.languageId,
        text: documentInfo.text,
        version: documentInfo.version
      } as protocol.TextDocumentItem
    };
    this.connection.sendNotification(
      'textDocument/didOpen',
      textDocumentMessage
    );
    this.openedUris.set(documentInfo.uri, true);
    this.sendChange(documentInfo);
  }

  /**
   * Sends the full text of the document to the server
   */
  sendChange(documentInfo: IDocumentInfo) {
    if (!this.isReady) {
      return;
    }
    if (!this.openedUris.get(documentInfo.uri)) {
      this.sendOpen(documentInfo);
      return;
    }
    const textDocumentChange: protocol.DidChangeTextDocumentParams = {
      textDocument: {
        uri: documentInfo.uri,
        version: documentInfo.version
      } as protocol.VersionedTextDocumentIdentifier,
      contentChanges: [{ text: documentInfo.text }]
    };
    this.connection.sendNotification(
      'textDocument/didChange',
      textDocumentChange
    );
    documentInfo.version++;
  }

  /**
   * Send save notification to the server.
   */
  sendSaved(documentInfo: IDocumentInfo) {
    if (!this.isReady) {
      return;
    }

    const textDocumentChange: protocol.DidSaveTextDocumentParams = {
      textDocument: {
        uri: documentInfo.uri,
        version: documentInfo.version
      } as protocol.VersionedTextDocumentIdentifier,
      text: documentInfo.text
    };
    this.connection.sendNotification(
      'textDocument/didSave',
      textDocumentChange
    );
  }

  /**
   * Send configuration change to the server.
   */
  sendConfigurationChange(settings: protocol.DidChangeConfigurationParams) {
    if (!this.isReady) {
      return;
    }

    this.connection.sendNotification(
      'workspace/didChangeConfiguration',
      settings
    );
  }

  /**
   * The internal websocket connection to the LSP handler
   */
  protected socket: WebSocket;

  /**
   * The json-rpc wrapper over the internal websocket connection.
   */
  protected connection: MessageConnection;

  /**
   * Map to track opened virtual documents..
   */
  protected openedUris = new Map<string, boolean>();

  /**
   * Server capabilities provider.
   */
  protected serverCapabilities: protocol.ServerCapabilities;

  protected _isConnected = false;
  protected _isInitialized = false;

  /**
   * Callback called when the server is initialized.
   */
  protected onServerInitialized(params: protocol.InitializeResult): void {
    this._isInitialized = true;
    this.serverCapabilities = params.capabilities;
    this.connection.sendNotification('initialized', {});
    this.connection.sendNotification('workspace/didChangeConfiguration', {
      settings: {}
    });
  }

  /**
   * Initialization parameters to be sent to the language server.
   * Subclasses should override this when adding more features.
   */
  protected initializeParams(): protocol.InitializeParams {
    return {
      capabilities: {} as protocol.ClientCapabilities,
      processId: null,
      rootUri: this._rootUri,
      workspaceFolders: null
    };
  }

  private _rootUri: string;
}
