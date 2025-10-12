// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import {
  ClientNotifications,
  ClientRequests,
  IClientRequestHandler,
  IClientRequestParams,
  IClientResult,
  IDocumentInfo,
  ILSPConnection,
  ILSPOptions,
  IServerRequestHandler,
  IServerRequestParams,
  IServerResult,
  Method,
  ServerNotifications,
  ServerRequests
} from './tokens';
import { untilReady } from './utils';
import {
  registerServerCapability,
  unregisterServerCapability
} from './ws-connection/server-capability-registration';
import { LspWsConnection } from './ws-connection/ws-connection';

import type * as lsp from 'vscode-languageserver-protocol';

import type { MessageConnection } from 'vscode-ws-jsonrpc';

/**
 * Helper class to handle client request
 */
class ClientRequestHandler<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> implements IClientRequestHandler
{
  constructor(
    protected connection: MessageConnection,
    protected method: T,
    protected emitter: LSPConnection
  ) {}
  request(params: IClientRequestParams[T]): Promise<IClientResult[T]> {
    // TODO check if is ready?
    this.emitter.log(MessageKind.clientRequested, {
      method: this.method,
      message: params
    });
    return this.connection
      .sendRequest(this.method, params)
      .then((result: IClientResult[T]) => {
        this.emitter.log(MessageKind.resultForClient, {
          method: this.method,
          message: params
        });
        return result;
      });
  }
}

/**
 * Helper class to handle server responses
 */
class ServerRequestHandler<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> implements IServerRequestHandler
{
  constructor(
    protected connection: MessageConnection,
    protected method: T,
    protected emitter: LSPConnection
  ) {
    // on request accepts "thenable"
    this.connection.onRequest(method, this._handle.bind(this));
    this._handler = null;
  }

  setHandler(
    handler: (
      params: IServerRequestParams[T],
      connection?: LSPConnection
    ) => Promise<IServerResult[T]>
  ) {
    this._handler = handler;
  }

  clearHandler() {
    this._handler = null;
  }

  private _handler:
    | ((
        params: IServerRequestParams[T],
        connection?: LSPConnection
      ) => Promise<IServerResult[T]>)
    | null;

  private _handle(
    request: IServerRequestParams[T]
  ): Promise<IServerResult[T] | undefined> {
    this.emitter.log(MessageKind.serverRequested, {
      method: this.method,
      message: request
    });
    if (!this._handler) {
      return new Promise(() => undefined);
    }
    return this._handler(request, this.emitter).then(result => {
      this.emitter.log(MessageKind.responseForServer, {
        method: this.method,
        message: result
      });
      return result;
    });
  }
}

export const Provider: { [key: string]: keyof lsp.ServerCapabilities } = {
  TEXT_DOCUMENT_SYNC: 'textDocumentSync',
  COMPLETION: 'completionProvider',
  HOVER: 'hoverProvider',
  SIGNATURE_HELP: 'signatureHelpProvider',
  DECLARATION: 'declarationProvider',
  DEFINITION: 'definitionProvider',
  TYPE_DEFINITION: 'typeDefinitionProvider',
  IMPLEMENTATION: 'implementationProvider',
  REFERENCES: 'referencesProvider',
  DOCUMENT_HIGHLIGHT: 'documentHighlightProvider',
  DOCUMENT_SYMBOL: 'documentSymbolProvider',
  CODE_ACTION: 'codeActionProvider',
  CODE_LENS: 'codeLensProvider',
  DOCUMENT_LINK: 'documentLinkProvider',
  COLOR: 'colorProvider',
  DOCUMENT_FORMATTING: 'documentFormattingProvider',
  DOCUMENT_RANGE_FORMATTING: 'documentRangeFormattingProvider',
  DOCUMENT_ON_TYPE_FORMATTING: 'documentOnTypeFormattingProvider',
  RENAME: 'renameProvider',
  FOLDING_RANGE: 'foldingRangeProvider',
  EXECUTE_COMMAND: 'executeCommandProvider',
  SELECTION_RANGE: 'selectionRangeProvider',
  WORKSPACE_SYMBOL: 'workspaceSymbolProvider',
  WORKSPACE: 'workspace'
};

type AnyMethodType =
  | typeof Method.ServerNotification
  | typeof Method.ClientNotification
  | typeof Method.ClientRequest
  | typeof Method.ServerRequest;
type AnyMethod =
  | Method.ServerNotification
  | Method.ClientNotification
  | Method.ClientRequest
  | Method.ServerRequest;

/**
 * Create a map between the request method and its handler
 */
function createMethodMap<T, H, U extends keyof T = keyof T>(
  methods: AnyMethodType,
  handlerFactory: (method: U) => H
): T {
  const result: { [key in U]?: H } = {};
  for (let method of Object.values(methods)) {
    result[method as U] = handlerFactory(method as U);
  }
  return result as T;
}

enum MessageKind {
  clientNotifiedServer,
  serverNotifiedClient,
  serverRequested,
  clientRequested,
  resultForClient,
  responseForServer
}

interface IMessageLog<T extends AnyMethod = AnyMethod> {
  method: T;
  message: any;
}

export class LSPConnection extends LspWsConnection implements ILSPConnection {
  constructor(options: ILSPOptions) {
    super(options);
    this._options = options;
    this.logAllCommunication = false;
    this.serverIdentifier = options.serverIdentifier;
    this.serverLanguage = options.languageId;
    this.documentsToOpen = [];
    this.clientNotifications =
      this.constructNotificationHandlers<ClientNotifications>(
        Method.ClientNotification
      );
    this.serverNotifications =
      this.constructNotificationHandlers<ServerNotifications>(
        Method.ServerNotification
      );
  }

  /**
   * Identifier of the language server
   */
  readonly serverIdentifier?: string;

  /**
   * Language of the language server
   */
  readonly serverLanguage?: string;

  /**
   * Notifications comes from the client.
   */
  readonly clientNotifications: ClientNotifications;

  /**
   * Notifications comes from the server.
   */
  readonly serverNotifications: ServerNotifications;

  /**
   * Requests comes from the client.
   */
  clientRequests: ClientRequests;

  /**
   * Responses comes from the server.
   */
  serverRequests: ServerRequests;

  /**
   * Should log all communication?
   */
  logAllCommunication: boolean;

  /**
   * Signal emitted when the connection is closed.
   */
  get closeSignal(): ISignal<ILSPConnection, boolean> {
    return this._closeSignal;
  }

  /**
   * Signal emitted when the connection receives an error
   * message.
   */
  get errorSignal(): ISignal<ILSPConnection, any> {
    return this._errorSignal;
  }

  /**
   * Signal emitted when the connection is initialized.
   */
  get serverInitialized(): ISignal<
    ILSPConnection,
    lsp.ServerCapabilities<any>
  > {
    return this._serverInitialized;
  }

  /**
   * Dispose the connection.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this.serverRequests) {
      // `serverRequests` may be undefined if dispose is called during initialization sequence
      Object.values(this.serverRequests).forEach(request =>
        request.clearHandler()
      );
    }
    this.close();
    super.dispose();
  }

  /**
   * Helper to print the logs to logger, for now we are using
   * directly the browser's console.
   */
  log(kind: MessageKind, message: IMessageLog): void {
    if (this.logAllCommunication) {
      console.log(kind, message);
    }
  }

  /**
   * Send the open request to the backend when the server is
   * ready.
   */
  sendOpenWhenReady(documentInfo: IDocumentInfo): void {
    if (this.isReady) {
      this.sendOpen(documentInfo);
    } else {
      this.documentsToOpen.push(documentInfo);
    }
  }

  /**
   * Send the document changes to the server.
   */
  sendSelectiveChange(
    changeEvent: lsp.TextDocumentContentChangeEvent,
    documentInfo: IDocumentInfo
  ): void {
    this._sendChange([changeEvent], documentInfo);
  }

  /**
   * Send all changes to the server.
   */
  sendFullTextChange(text: string, documentInfo: IDocumentInfo): void {
    this._sendChange([{ text }], documentInfo);
  }

  /**
   * Check if a capability is available in the server capabilities.
   */
  provides(capability: keyof lsp.ServerCapabilities): boolean {
    return !!(this.serverCapabilities && this.serverCapabilities[capability]);
  }

  /**
   * Close the connection to the server.
   */
  close(): void {
    try {
      this._closingManually = true;
      super.close();
    } catch (e) {
      this._closingManually = false;
    }
  }

  /**
   * Initialize a connection over a web socket that speaks the LSP.
   */
  connect(socket: WebSocket): void {
    super.connect(socket);
    untilReady(() => {
      return this.isConnected;
    }, -1)
      .then(() => {
        const disposable = this.connection.onClose(() => {
          this._isConnected = false;
          this._closeSignal.emit(this._closingManually);
        });
        this._disposables.push(disposable);
      })
      .catch(() => {
        console.error('Could not connect onClose signal');
      });
  }

  /**
   * Get send request to the server to get completion results
   * from a completion item
   */
  async getCompletionResolve(
    completionItem: lsp.CompletionItem
  ): Promise<lsp.CompletionItem | undefined> {
    if (!this.isReady) {
      return;
    }
    return this.connection.sendRequest<lsp.CompletionItem>(
      'completionItem/resolve',
      completionItem
    );
  }

  /**
   * List of documents waiting to be opened once the connection
   * is ready.
   */
  protected documentsToOpen: IDocumentInfo[];

  /**
   * Generate the notification handlers
   */
  protected constructNotificationHandlers<
    T extends ServerNotifications | ClientNotifications
  >(
    methods: typeof Method.ServerNotification | typeof Method.ClientNotification
  ): T {
    const factory = () => new Signal<any, any>(this);
    return createMethodMap<T, Signal<any, any>>(methods, factory);
  }

  /**
   * Generate the client request handler
   */
  protected constructClientRequestHandler<
    T extends ClientRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ClientRequest): T {
    return createMethodMap<T, IClientRequestHandler>(
      methods,
      method =>
        new ClientRequestHandler(this.connection, method as U as any, this)
    );
  }

  /**
   * Generate the server response handler
   */
  protected constructServerRequestHandler<
    T extends ServerRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ServerRequest): T {
    return createMethodMap<T, IServerRequestHandler>(
      methods,
      method =>
        new ServerRequestHandler(this.connection, method as U as any, this)
    );
  }

  /**
   * Initialization parameters to be sent to the language server.
   * Subclasses can overload this when adding more features.
   */
  protected initializeParams(): lsp.InitializeParams {
    return {
      ...super.initializeParams(),
      capabilities: this._options.capabilities,
      initializationOptions: null,
      processId: null,
      workspaceFolders: null
    };
  }

  /**
   * Callback called when the server is initialized.
   */
  protected onServerInitialized(params: lsp.InitializeResult): void {
    this.afterInitialized();
    super.onServerInitialized(params);
    while (this.documentsToOpen.length) {
      this.sendOpen(this.documentsToOpen.pop()!);
    }
    this._serverInitialized.emit(this.serverCapabilities);
  }

  /**
   * Once the server is initialized, this method generates the
   * client and server handlers
   */
  protected afterInitialized(): void {
    const disposable = this.connection.onError(e => this._errorSignal.emit(e));
    this._disposables.push(disposable);
    for (const method of Object.values(
      Method.ServerNotification
    ) as (keyof ServerNotifications)[]) {
      const signal = this.serverNotifications[method] as Signal<any, any>;
      const disposable = this.connection.onNotification(method, params => {
        this.log(MessageKind.serverNotifiedClient, {
          method,
          message: params
        });
        signal.emit(params);
      });
      this._disposables.push(disposable);
    }

    for (const method of Object.values(
      Method.ClientNotification
    ) as (keyof ClientNotifications)[]) {
      const signal = this.clientNotifications[method] as Signal<any, any>;
      signal.connect((emitter, params) => {
        this.log(MessageKind.clientNotifiedServer, {
          method,
          message: params
        });
        this.connection.sendNotification(method, params).catch(console.error);
      });
    }

    this.clientRequests = this.constructClientRequestHandler<ClientRequests>(
      Method.ClientRequest
    );
    this.serverRequests = this.constructServerRequestHandler<ServerRequests>(
      Method.ServerRequest
    );

    this.serverRequests['client/registerCapability'].setHandler(
      async (params: lsp.RegistrationParams) => {
        params.registrations.forEach(
          (capabilityRegistration: lsp.Registration) => {
            try {
              const updatedCapabilities = registerServerCapability(
                this.serverCapabilities,
                capabilityRegistration
              );
              if (updatedCapabilities === null) {
                console.error(
                  `Failed to register server capability: ${capabilityRegistration}`
                );
                return;
              }
              this.serverCapabilities = updatedCapabilities;
            } catch (err) {
              console.error(err);
            }
          }
        );
      }
    );

    this.serverRequests['client/unregisterCapability'].setHandler(
      async (params: lsp.UnregistrationParams) => {
        params.unregisterations.forEach(
          (capabilityUnregistration: lsp.Unregistration) => {
            this.serverCapabilities = unregisterServerCapability(
              this.serverCapabilities,
              capabilityUnregistration
            );
          }
        );
      }
    );

    this.serverRequests['workspace/configuration'].setHandler(async params => {
      return params.items.map(item => {
        // LSP: "If the client can’t provide a configuration setting for a given scope
        // then `null` needs to be present in the returned array."

        // for now we do not support configuration, but yaml server does not respect
        // client capability so we have a handler just for that
        return null;
      });
    });
  }

  /**
   * Is the connection is closed manually?
   */
  private _closingManually = false;

  private _options: ILSPOptions;

  private _closeSignal: Signal<ILSPConnection, boolean> = new Signal(this);
  private _errorSignal: Signal<ILSPConnection, any> = new Signal(this);
  private _serverInitialized: Signal<
    ILSPConnection,
    lsp.ServerCapabilities<any>
  > = new Signal(this);

  /**
   * Send the document changed data to the server.
   */
  private _sendChange(
    changeEvents: lsp.TextDocumentContentChangeEvent[],
    documentInfo: IDocumentInfo
  ) {
    if (!this.isReady) {
      return;
    }
    if (documentInfo.uri.length === 0) {
      return;
    }
    if (!this.openedUris.get(documentInfo.uri)) {
      this.sendOpen(documentInfo);
    }
    const textDocumentChange: lsp.DidChangeTextDocumentParams = {
      textDocument: {
        uri: documentInfo.uri,
        version: documentInfo.version
      } as lsp.VersionedTextDocumentIdentifier,
      contentChanges: changeEvents
    };
    this.connection
      .sendNotification('textDocument/didChange', textDocumentChange)
      .catch(console.error);
    documentInfo.version++;
  }
}
