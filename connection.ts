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
import type * as rpc from 'vscode-jsonrpc';
import type * as lsp from 'vscode-languageserver-protocol';
import type { MessageConnection } from 'vscode-ws-jsonrpc';

import { until_ready } from './utils';

interface ILSPOptions extends ILspOptions {
  serverIdentifier?: string;
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
  export enum ServerRequests {
    REGISTER_CAPABILITY = 'client/registerCapability',
    SHOW_MESSAGE_REQUEST = 'window/showMessageRequest',
    UNREGISTER_CAPABILITY = 'client/unregisterCapability'
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
  [Method.ServerRequests.REGISTER_CAPABILITY]: lsp.RegistrationParams;
  [Method.ServerRequests.SHOW_MESSAGE_REQUEST]: lsp.ShowMessageRequestParams;
  [Method.ServerRequests.UNREGISTER_CAPABILITY]: lsp.UnregistrationParams;
}

export interface IServerResult {
  [Method.ServerRequests.REGISTER_CAPABILITY]: void;
  [Method.ServerRequests.SHOW_MESSAGE_REQUEST]: lsp.MessageActionItem | null;
  [Method.ServerRequests.UNREGISTER_CAPABILITY]: void;
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
  // ISignal does not have emit, which is intended - client cannot emit server notifications.
  [key in T]: ISignal<LSPConnection, IServerNotifyParams[key]>;
};

export type ClientNotifications<
  T extends keyof IClientNotifyParams = keyof IClientNotifyParams
> = {
  // Signal has emit.
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
  // has async request(params) returning a promise with result.
  [key in T]: IClientRequestHandler<key>;
};

export type ServerRequests<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> = {
  // has async request(params) returning a promise with result.
  [key in T]: IServerRequestHandler<key>;
};

class ClientRequestHandler<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> implements IClientRequestHandler {
  constructor(protected connection: MessageConnection, protected method: T) {}
  request(params: IClientRequestParams[T]): Promise<IClientResult[T]> {
    return this.connection.sendRequest(this.method, params);
  }
}

class ServerRequestHandler<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> implements IServerRequestHandler {
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
    this.connection.onRequest(method, this.handle);
    this._handler = null;
  }

  private handle(request: IServerRequestParams[T]): Promise<IServerResult[T]> {
    if (!this._handler) {
      return;
    }
    return this._handler(request, this.emitter);
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

export class LSPConnection extends LspWsConnection {
  protected documentsToOpen: IDocumentInfo[];
  public serverIdentifier: string;

  public serverNotifications: ServerNotifications;
  public clientNotifications: ClientNotifications;
  public clientRequests: ClientRequests;
  public serverRequests: ServerRequests;

  protected constructNotificationHandlers<
    T extends ServerNotifications | ClientNotifications,
    U extends keyof T = keyof T
  >(
    methods: typeof Method.ServerNotification | typeof Method.ClientNotification
  ) {
    const result: { [key in U]?: Signal<any, any> } = {};
    for (let method of Object.values(methods)) {
      result[method as U] = new Signal<any, any>(this);
    }
    return result as T;
  }

  protected constructClientRequestHandler<
    T extends ClientRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ClientRequest) {
    const result: { [key in U]?: IClientRequestHandler } = {};
    for (let method of Object.values(methods)) {
      result[method as U] = new ClientRequestHandler(
        this.connection,
        (method as U) as any
      );
    }
    return result as T;
  }

  protected constructServerRequestHandler<
    T extends ServerRequests,
    U extends keyof T = keyof T
  >(methods: typeof Method.ServerRequests) {
    const result: { [key in U]?: IServerRequestHandler } = {};
    for (let method of Object.values(methods)) {
      result[method as U] = new ServerRequestHandler(
        this.connection,
        (method as U) as any,
        this
      );
    }
    return result as T;
  }

  constructor(options: ILSPOptions) {
    super(options);
    this.serverIdentifier = options?.serverIdentifier;
    this.documentsToOpen = [];
    this.serverNotifications = this.constructNotificationHandlers<
      ServerNotifications
    >(Method.ServerNotification);
    this.clientNotifications = this.constructNotificationHandlers<
      ClientNotifications
    >(Method.ClientNotification);
  }

  sendOpenWhenReady(documentInfo: IDocumentInfo) {
    if (this.isReady) {
      this.sendOpen(documentInfo);
    } else {
      this.documentsToOpen.push(documentInfo);
    }
  }

  protected onServerInitialized(params: lsp.InitializeResult) {
    super.onServerInitialized(params);
    while (this.documentsToOpen.length) {
      this.sendOpen(this.documentsToOpen.pop());
    }

    for (const method of Object.values(
      Method.ServerNotification
    ) as (keyof ServerNotifications)[]) {
      const signal = this.serverNotifications[method] as Signal<any, any>;
      this.connection.onNotification(method, params => {
        signal.emit(params);
      });
    }

    for (const method of Object.values(
      Method.ClientNotification
    ) as (keyof ClientNotifications)[]) {
      const signal = this.clientNotifications[method] as Signal<any, any>;
      signal.connect((emitter, params) => {
        this.connection.sendNotification(method, params);
      });
    }

    this.clientRequests = this.constructClientRequestHandler<ClientRequests>(
      Method.ClientRequest
    );
    this.serverRequests = this.constructServerRequestHandler<ServerRequests>(
      Method.ServerRequests
    );
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
