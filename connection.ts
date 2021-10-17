// Disclaimer/acknowledgement: Fragments are based on LspWsConnection, which is copyright of wylieconlon and contributors and ISC licenced.
// ISC licence is, quote, "functionally equivalent to the simplified BSD and MIT licenses,
// but without language deemed unnecessary following the Berne Convention." (Wikipedia).
// Introduced modifications are BSD licenced, copyright JupyterLab development team.
import { ISignal, Signal } from '@lumino/signaling';
import {
  AnyCompletion,
  AnyLocation,
  IDocumentInfo,
  ILspOptions,
  IPosition,
  LspWsConnection
} from 'lsp-ws-connection';
import {
  registerServerCapability,
  unregisterServerCapability
} from 'lsp-ws-connection/lib/server-capability-registration';
import type * as rpc from 'vscode-jsonrpc';
import type * as lsp from 'vscode-languageserver-protocol';
import type { MessageConnection } from 'vscode-ws-jsonrpc';

import { ILSPLogConsole } from './tokens';
import { until_ready } from './utils';

interface ILSPOptions extends ILspOptions {
  serverIdentifier?: string;
  console: ILSPLogConsole;
}

/**
 * Method strings are reproduced here because a non-typing import of
 * `vscode-languageserver-protocol` is ridiculously expensive.
 */
export namespace Method {
  /** Server notifications */
  export enum ServerNotification {
    PUBLISH_DIAGNOSTICS = 'textDocument/publishDiagnostics',
    SHOW_MESSAGE = 'window/showMessage',
    LOG_TRACE = '$/logTrace',
    LOG_MESSAGE = 'window/logMessage'
  }

  /** Client notifications */
  export enum ClientNotification {
    DID_CHANGE = 'textDocument/didChange',
    DID_CHANGE_CONFIGURATION = 'workspace/didChangeConfiguration',
    DID_OPEN = 'textDocument/didOpen',
    DID_SAVE = 'textDocument/didSave',
    INITIALIZED = 'initialized',
    SET_TRACE = '$/setTrace'
  }

  /** Server requests */
  export enum ServerRequest {
    REGISTER_CAPABILITY = 'client/registerCapability',
    SHOW_MESSAGE_REQUEST = 'window/showMessageRequest',
    UNREGISTER_CAPABILITY = 'client/unregisterCapability',
    WORKSPACE_CONFIGURATION = 'workspace/configuration'
  }

  /** Client requests */
  export enum ClientRequest {
    COMPLETION = 'textDocument/completion',
    COMPLETION_ITEM_RESOLVE = 'completionItem/resolve',
    DEFINITION = 'textDocument/definition',
    DOCUMENT_HIGHLIGHT = 'textDocument/documentHighlight',
    DOCUMENT_SYMBOL = 'textDocument/documentSymbol',
    HOVER = 'textDocument/hover',
    IMPLEMENTATION = 'textDocument/implementation',
    INITIALIZE = 'initialize',
    REFERENCES = 'textDocument/references',
    RENAME = 'textDocument/rename',
    SIGNATURE_HELP = 'textDocument/signatureHelp',
    TYPE_DEFINITION = 'textDocument/typeDefinition'
  }
}

export interface IServerNotifyParams {
  [Method.ServerNotification.LOG_MESSAGE]: lsp.LogMessageParams;
  [Method.ServerNotification.LOG_TRACE]: rpc.LogTraceParams;
  [Method.ServerNotification.PUBLISH_DIAGNOSTICS]: lsp.PublishDiagnosticsParams;
  [Method.ServerNotification.SHOW_MESSAGE]: lsp.ShowMessageParams;
}

export interface IClientNotifyParams {
  [Method.ClientNotification
    .DID_CHANGE_CONFIGURATION]: lsp.DidChangeConfigurationParams;
  [Method.ClientNotification.DID_CHANGE]: lsp.DidChangeTextDocumentParams;
  [Method.ClientNotification.DID_OPEN]: lsp.DidOpenTextDocumentParams;
  [Method.ClientNotification.DID_SAVE]: lsp.DidSaveTextDocumentParams;
  [Method.ClientNotification.INITIALIZED]: lsp.InitializedParams;
  [Method.ClientNotification.SET_TRACE]: rpc.SetTraceParams;
}

export interface IServerRequestParams {
  [Method.ServerRequest.REGISTER_CAPABILITY]: lsp.RegistrationParams;
  [Method.ServerRequest.SHOW_MESSAGE_REQUEST]: lsp.ShowMessageRequestParams;
  [Method.ServerRequest.UNREGISTER_CAPABILITY]: lsp.UnregistrationParams;
  [Method.ServerRequest.WORKSPACE_CONFIGURATION]: lsp.ConfigurationParams;
}

export interface IServerResult {
  [Method.ServerRequest.REGISTER_CAPABILITY]: void;
  [Method.ServerRequest.SHOW_MESSAGE_REQUEST]: lsp.MessageActionItem | null;
  [Method.ServerRequest.UNREGISTER_CAPABILITY]: void;
  [Method.ServerRequest.WORKSPACE_CONFIGURATION]: any[];
}

export interface IClientRequestParams {
  [Method.ClientRequest.COMPLETION_ITEM_RESOLVE]: lsp.CompletionItem;
  [Method.ClientRequest.COMPLETION]: lsp.CompletionParams;
  [Method.ClientRequest.DEFINITION]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.DOCUMENT_HIGHLIGHT]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.DOCUMENT_SYMBOL]: lsp.DocumentSymbolParams;
  [Method.ClientRequest.HOVER]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.IMPLEMENTATION]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.INITIALIZE]: lsp.InitializeParams;
  [Method.ClientRequest.REFERENCES]: lsp.ReferenceParams;
  [Method.ClientRequest.RENAME]: lsp.RenameParams;
  [Method.ClientRequest.SIGNATURE_HELP]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.TYPE_DEFINITION]: lsp.TextDocumentPositionParams;
}

export interface IClientResult {
  [Method.ClientRequest.COMPLETION_ITEM_RESOLVE]: lsp.CompletionItem;
  [Method.ClientRequest.COMPLETION]: AnyCompletion;
  [Method.ClientRequest.DEFINITION]: AnyLocation;
  [Method.ClientRequest.DOCUMENT_HIGHLIGHT]: lsp.DocumentHighlight[];
  [Method.ClientRequest.DOCUMENT_SYMBOL]: lsp.DocumentSymbol[];
  [Method.ClientRequest.HOVER]: lsp.Hover;
  [Method.ClientRequest.IMPLEMENTATION]: AnyLocation;
  [Method.ClientRequest.INITIALIZE]: lsp.InitializeResult;
  [Method.ClientRequest.REFERENCES]: Location[];
  [Method.ClientRequest.RENAME]: lsp.WorkspaceEdit;
  [Method.ClientRequest.SIGNATURE_HELP]: lsp.SignatureHelp;
  [Method.ClientRequest.TYPE_DEFINITION]: AnyLocation;
}

export type ServerNotifications<
  T extends keyof IServerNotifyParams = keyof IServerNotifyParams
> = {
  readonly // ISignal does not have emit, which is intended - client cannot emit server notifications.
  [key in T]: ISignal<LSPConnection, IServerNotifyParams[key]>;
};

export type ClientNotifications<
  T extends keyof IClientNotifyParams = keyof IClientNotifyParams
> = {
  readonly // Signal has emit.
  [key in T]: Signal<LSPConnection, IClientNotifyParams[key]>;
};

export interface IClientRequestHandler<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> {
  request(params: IClientRequestParams[T]): Promise<IClientResult[T]>;
}

export interface IServerRequestHandler<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> {
  setHandler(
    handler: (
      params: IServerRequestParams[T],
      connection?: LSPConnection
    ) => Promise<IServerResult[T]>
  ): void;
  clearHandler(): void;
}

export type ClientRequests<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> = {
  readonly // has async request(params) returning a promise with result.
  [key in T]: IClientRequestHandler<key>;
};

export type ServerRequests<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> = {
  readonly // has async request(params) returning a promise with result.
  [key in T]: IServerRequestHandler<key>;
};

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
    this.emitter.log(MessageKind.client_requested, {
      method: this.method,
      message: params
    });
    return this.connection
      .sendRequest(this.method, params)
      .then((result: IClientResult[T]) => {
        this.emitter.log(MessageKind.result_for_client, {
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
  private _handler: (
    params: IServerRequestParams[T],
    connection?: LSPConnection
  ) => Promise<IServerResult[T]>;

  constructor(
    protected connection: MessageConnection,
    protected method: T,
    protected emitter: LSPConnection
  ) {
    // on request accepts "thenable"
    this.connection.onRequest(method, this.handle.bind(this));
    this._handler = null;
  }

  private handle(request: IServerRequestParams[T]): Promise<IServerResult[T]> {
    this.emitter.log(MessageKind.server_requested, {
      method: this.method,
      message: request
    });
    if (!this._handler) {
      return;
    }
    return this._handler(request, this.emitter).then(result => {
      this.emitter.log(MessageKind.response_for_server, {
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
) {
  const result: { [key in U]?: H } = {};
  for (let method of Object.values(methods)) {
    result[method as U] = handlerFactory(method as U);
  }
  return result as T;
}

enum MessageKind {
  client_notified_server,
  server_notified_client,
  server_requested,
  client_requested,
  result_for_client,
  response_for_server
}

interface IMessageLog<T extends AnyMethod = AnyMethod> {
  method: T;
  message: any;
}

export class LSPConnection extends LspWsConnection {
  protected documentsToOpen: IDocumentInfo[];
  public serverIdentifier: string;

  public clientNotifications: ClientNotifications;
  public serverNotifications: ServerNotifications;
  public clientRequests: ClientRequests;
  public serverRequests: ServerRequests;
  protected console: ILSPLogConsole;
  public logAllCommunication: boolean;

  public log(kind: MessageKind, message: IMessageLog) {
    if (this.logAllCommunication) {
      this.console.log(kind, message);
    }
  }

  protected constructNotificationHandlers<
    T extends ServerNotifications | ClientNotifications
  >(
    methods: typeof Method.ServerNotification | typeof Method.ClientNotification
  ) {
    return createMethodMap<T, Signal<any, any>>(
      methods,
      () => new Signal<any, any>(this)
    );
  }

  protected constructClientRequestHandler<
    T extends ClientRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ClientRequest) {
    return createMethodMap<T, IClientRequestHandler>(
      methods,
      method =>
        new ClientRequestHandler(this.connection, method as U as any, this)
    );
  }

  protected constructServerRequestHandler<
    T extends ServerRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ServerRequest) {
    return createMethodMap<T, IServerRequestHandler>(
      methods,
      method =>
        new ServerRequestHandler(this.connection, method as U as any, this)
    );
  }

  constructor(options: ILSPOptions) {
    super(options);
    this.logAllCommunication = false;
    this.serverIdentifier = options?.serverIdentifier;
    this.console = options.console.scope(this.serverIdentifier + ' connection');
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

  sendOpenWhenReady(documentInfo: IDocumentInfo) {
    if (this.isReady) {
      this.sendOpen(documentInfo);
    } else {
      this.documentsToOpen.push(documentInfo);
    }
  }

  protected onServerInitialized(params: lsp.InitializeResult) {
    this.afterInitialized();
    super.onServerInitialized(params);
    while (this.documentsToOpen.length) {
      this.sendOpen(this.documentsToOpen.pop());
    }
  }

  protected afterInitialized() {
    for (const method of Object.values(
      Method.ServerNotification
    ) as (keyof ServerNotifications)[]) {
      const signal = this.serverNotifications[method] as Signal<any, any>;
      this.connection.onNotification(method, params => {
        this.log(MessageKind.server_notified_client, {
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
        this.log(MessageKind.client_notified_server, {
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
              this.serverCapabilities = registerServerCapability(
                this.serverCapabilities,
                capabilityRegistration
              );
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
  ) {
    this._sendChange([changeEvent], documentInfo);
  }

  public sendFullTextChange(text: string, documentInfo: IDocumentInfo): void {
    this._sendChange([{ text }], documentInfo);
  }

  /**
   * @deprecated The method should not be used in new code. Use provides() instead.
   */
  public isRenameSupported() {
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
  ): Promise<lsp.WorkspaceEdit> {
    if (!this.isReady || !this.isRenameSupported()) {
      return;
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

    until_ready(() => {
      return this.isConnected;
    }, -1)
      .then(() => {
        this.connection.onClose(() => {
          this.isConnected = false;
          this.emit('close', this.closing_manually);
        });
      })
      .catch(() => {
        console.error('Could not connect onClose signal');
      });
    return this;
  }

  private closing_manually = false;

  public close() {
    try {
      this.closing_manually = true;
      super.close();
    } catch (e) {
      this.closing_manually = false;
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

  async getCompletionResolve(completionItem: lsp.CompletionItem) {
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
    return this.serverCapabilities?.completionProvider?.resolveProvider;
  }
}
