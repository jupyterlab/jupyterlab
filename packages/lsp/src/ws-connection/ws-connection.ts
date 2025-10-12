/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Disclaimer/acknowledgement: Fragments are based on https://github.com/wylieconlon/lsp-editor-adapter,
// which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.

import { ConsoleLogger, listen, MessageConnection } from 'vscode-ws-jsonrpc';

import { ISignal, Signal } from '@lumino/signaling';

import {
  registerServerCapability,
  unregisterServerCapability
} from './server-capability-registration';
import { IDocumentInfo, ILspConnection, ILspOptions } from './types';

import type * as protocol from 'vscode-languageserver-protocol';

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
   * A signal emitted when the connection is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Check if the connection is disposed
   */
  get isDisposed(): boolean {
    return this._isDisposed;
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

        const registerCapabilityDisposable = this.connection.onRequest(
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
        this._disposables.push(registerCapabilityDisposable);

        const unregisterCapabilityDisposable = this.connection.onRequest(
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
        this._disposables.push(unregisterCapabilityDisposable);

        const disposable = this.connection.onClose(() => {
          this._isConnected = false;
        });
        this._disposables.push(disposable);
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
    this.connection
      .sendNotification('textDocument/didOpen', textDocumentMessage)
      .catch(console.error);
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
    this.connection
      .sendNotification('textDocument/didChange', textDocumentChange)
      .catch(console.error);
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
    this.connection
      .sendNotification('textDocument/didSave', textDocumentChange)
      .catch(console.error);
  }

  /**
   * Send configuration change to the server.
   */
  sendConfigurationChange(settings: protocol.DidChangeConfigurationParams) {
    if (!this.isReady) {
      return;
    }

    this.connection
      .sendNotification('workspace/didChangeConfiguration', settings)
      .catch(console.error);
  }

  /**
   * Dispose the connection.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposables.forEach(disposable => {
      disposable.dispose();
    });
    this._disposed.emit();
    Signal.clearData(this);
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
   * Lists server capabilities.
   */
  serverCapabilities: protocol.ServerCapabilities;

  /**
   * The connection is connected?
   */
  protected _isConnected = false;

  /**
   * The connection is initialized?
   */
  protected _isInitialized = false;

  /**
   * Array of LSP callback disposables, it is used to
   * clear the callbacks when the connection is disposed.
   */
  protected _disposables: Array<protocol.Disposable> = [];

  /**
   * Callback called when the server is initialized.
   */
  protected onServerInitialized(params: protocol.InitializeResult): void {
    this._isInitialized = true;
    this.serverCapabilities = params.capabilities;
    this.connection.sendNotification('initialized', {}).catch(console.error);
    this.connection
      .sendNotification('workspace/didChangeConfiguration', {
        settings: {}
      })
      .catch(console.error);
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

  /**
   * URI of the LSP handler endpoint.
   */
  private _rootUri: string;

  private _disposed = new Signal<this, void>(this);

  private _isDisposed = false;
}
