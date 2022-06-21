// Disclaimer/acknowledgement: Fragments are based on LspWsConnection, which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.
import { Signal } from '@lumino/signaling';
import { IDocumentInfo, IPosition, LspWsConnection } from 'lsp-ws-connection';
import {
  registerServerCapability,
  unregisterServerCapability
} from 'lsp-ws-connection/lib/server-capability-registration';

import {
  ClientNotifications,
  ClientRequests,
  IClientRequestHandler,
  IClientRequestParams,
  IClientResult,
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

import type * as lsp from 'vscode-languageserver-protocol';

import type { MessageConnection } from 'vscode-ws-jsonrpc';

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

class ServerRequestHandler<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> implements IServerRequestHandler
{
  private _handler:
    | ((
        params: IServerRequestParams[T],
        connection?: LSPConnection
      ) => Promise<IServerResult[T]>)
    | null;

  constructor(
    protected connection: MessageConnection,
    protected method: T,
    protected emitter: LSPConnection
  ) {
    // on request accepts "thenable"
    this.connection.onRequest(method, this.handle.bind(this));
    this._handler = null;
  }

  private handle(
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
  public serverIdentifier?: string;
  public serverLanguage?: string;
  public clientNotifications: ClientNotifications;
  public serverNotifications: ServerNotifications;
  public clientRequests: ClientRequests;
  public serverRequests: ServerRequests;
  public logAllCommunication: boolean;

  protected documentsToOpen: IDocumentInfo[];

  private _options: ILSPOptions;

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

  public log(kind: MessageKind, message: IMessageLog): void {
    if (this.logAllCommunication) {
      console.log(kind, message);
    }
  }

  protected constructNotificationHandlers<
    T extends ServerNotifications | ClientNotifications
  >(
    methods: typeof Method.ServerNotification | typeof Method.ClientNotification
  ): T {
    return createMethodMap<T, Signal<any, any>>(
      methods,
      () => new Signal<any, any>(this)
    );
  }

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
      // TODO: remove as `lsp.ClientCapabilities` after upgrading to 3.17
      // which should finally include a fix for moniker issue:
      // https://github.com/microsoft/vscode-languageserver-node/pull/720
      capabilities: this._options.capabilities as lsp.ClientCapabilities,
      initializationOptions: null,
      processId: null,
      workspaceFolders: null
    };
  }

  sendOpenWhenReady(documentInfo: IDocumentInfo): void {
    if (this.isReady) {
      this.sendOpen(documentInfo);
    } else {
      this.documentsToOpen.push(documentInfo);
    }
  }

  protected onServerInitialized(params: lsp.InitializeResult): void {
    this.afterInitialized();
    super.onServerInitialized(params);
    while (this.documentsToOpen.length) {
      this.sendOpen(this.documentsToOpen.pop()!);
    }
  }

  protected afterInitialized(): void {
    for (const method of Object.values(
      Method.ServerNotification
    ) as (keyof ServerNotifications)[]) {
      const signal = this.serverNotifications[method] as Signal<any, any>;
      this.connection.onNotification(method, params => {
        this.log(MessageKind.serverNotifiedClient, {
          method,
          message: params
        });
        signal.emit(params);
      });
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
        this.connection.sendNotification(method, params);
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

  public sendSelectiveChange(
    changeEvent: lsp.TextDocumentContentChangeEvent,
    documentInfo: IDocumentInfo
  ): void {
    this._sendChange([changeEvent], documentInfo);
  }

  public sendFullTextChange(text: string, documentInfo: IDocumentInfo): void {
    this._sendChange([{ text }], documentInfo);
  }

  /**
   * @deprecated The method should not be used in new code. Use provides() instead.
   */
  public isRenameSupported(): boolean {
    return !!(
      this.serverCapabilities && this.serverCapabilities.renameProvider
    );
  }

  provides(provider: keyof lsp.ServerCapabilities): boolean {
    return !!(this.serverCapabilities && this.serverCapabilities[provider]);
  }

  /**
   * @deprecated The method should not be used in new code
   */
  async rename(
    location: IPosition,
    documentInfo: IDocumentInfo,
    newName: string,
    emit = true
  ): Promise<lsp.WorkspaceEdit | null> {
    if (!this.isReady || !this.isRenameSupported()) {
      return null;
    }

    const params: lsp.RenameParams = {
      textDocument: {
        uri: documentInfo.uri
      },
      position: {
        line: location.line,
        character: location.ch
      },
      newName
    };

    const edit: lsp.WorkspaceEdit = await this.connection.sendRequest(
      'textDocument/rename',
      params
    );

    if (emit) {
      this.emit('renamed', edit);
    }

    return edit;
  }

  public connect(socket: WebSocket): this {
    super.connect(socket);
    untilReady(() => {
      return this.isConnected;
    }, -1)
      .then(() => {
        this.connection.onClose(() => {
          this.isConnected = false;
          this.emit('close', this.closingManually);
        });
      })
      .catch(() => {
        console.error('Could not connect onClose signal');
      });
    return this;
  }

  private closingManually = false;

  public close(): void {
    try {
      this.closingManually = true;
      super.close();
    } catch (e) {
      this.closingManually = false;
    }
  }

  private _sendChange(
    changeEvents: lsp.TextDocumentContentChangeEvent[],
    documentInfo: IDocumentInfo
  ) {
    if (!this.isReady) {
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
    this.connection.sendNotification(
      'textDocument/didChange',
      textDocumentChange
    );
    documentInfo.version++;
  }

  async getCompletionResolve(
    completionItem: lsp.CompletionItem
  ): Promise<lsp.CompletionItem | undefined> {
    if (!this.isReady || !this.isCompletionResolveProvider()) {
      return;
    }
    return this.connection.sendRequest<lsp.CompletionItem>(
      'completionItem/resolve',
      completionItem
    );
  }

  /**
   * Does support completionItem/resolve?
   * @deprecated The method should not be used in new code
   */
  public isCompletionResolveProvider(): boolean {
    return (
      this.serverCapabilities?.completionProvider?.resolveProvider || false
    );
  }
}
