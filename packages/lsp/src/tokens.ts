// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ServerConnection } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import {
  AnyCompletion,
  AnyLocation,
  IDocumentInfo,
  ILspConnection,
  ILspOptions,
  IPosition,
  ITokenInfo
} from 'lsp-ws-connection';

import { WidgetLSPAdapter } from './adapters/adapter';
import { IForeignCodeExtractor } from './extractors/types';
import { ClientCapabilities, LanguageIdentifier } from './lsp';
import { LanguageServer1 as LSPLanguageServerSettings } from './plugin';
import * as SCHEMA from './schema';
import { VirtualDocument } from './virtual/document';

import type * as rpc from 'vscode-jsonrpc';
import type * as lsp from 'vscode-languageserver-protocol';
import { IDisposable } from '@lumino/disposable';

export type TLanguageServerId =
  | 'pylsp'
  | 'bash-language-server'
  | 'dockerfile-language-server-nodejs'
  | 'javascript-typescript-langserver'
  | 'unified-language-server'
  | 'vscode-css-languageserver-bin'
  | 'vscode-html-languageserver-bin'
  | 'vscode-json-languageserver-bin'
  | 'yaml-language-server'
  | 'r-languageserver';

export type TServerKeys = TLanguageServerId;
export type TLanguageServerConfigurations = Partial<
  Record<TServerKeys, LSPLanguageServerSettings>
>;

export type TSessionMap = Map<TServerKeys, SCHEMA.LanguageServerSession>;
export type TSpecsMap = Map<TServerKeys, SCHEMA.LanguageServerSpec>;

export type TLanguageId = string;

export interface ILanguageServerManager extends IDisposable {
  /**
   * @alpha
   *
   * Signal emitted when the language server sessions are changed.
   */
  sessionsChanged: ISignal<ILanguageServerManager, void>;

  /**
   * @alpha
   *
   * The current session information of running language servers.
   */
  readonly sessions: TSessionMap;

  /**
   * @alpha
   *
   * A promise that is fulfilled when the connection manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * @alpha
   *
   * Current endpoint to get the status of running language servers
   */
  readonly statusUrl: string;

  /**
   * @alpha
   *
   * Status code of the `fetchSession` request.
   */
  readonly statusCode: number;

  /**
   * @alpha
   *
   * An ordered list of matching >running< sessions, with servers of higher rank higher in the list
   */
  getMatchingServers(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TLanguageServerId[];

  /**
   * @alpha
   *
   * A list of all known matching specs (whether detected or not).
   */
  getMatchingSpecs(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TSpecsMap;

  /**
   * @alpha
   *
   * Set the configuration for language servers
   */
  setConfiguration(configuration: TLanguageServerConfigurations): void;

  /**
   * @alpha
   *
   * Send a request to language server handler to get the session information.
   */
  fetchSessions(): Promise<void>;
}

export namespace ILanguageServerManager {
  export const URL_NS = 'lsp';
  export interface IOptions {
    settings?: ServerConnection.ISettings;
    baseUrl?: string;
    /**
     * Number of connection retries to fetch the sessions.
     * Default 2.
     */
    retries?: number;
    /**
     * The interval for retries, default 10 seconds.
     */
    retriesInterval?: number;
  }
  export interface IGetServerIdOptions {
    language?: TLanguageId;
    mimeType?: string;
  }
}

export interface ISocketConnectionOptions {
  virtualDocument: VirtualDocument;
  /**
   * The language identifier, corresponding to the API endpoint on the LSP proxy server.
   */
  language: string;

  /**
   * LSP capabilities describing currently supported features
   */
  capabilities: ClientCapabilities;

  hasLspSupportedFile: boolean;
}
export interface IDocumentRegistationOptions {
  /**
   * The language identifier, corresponding to the API endpoint on the LSP proxy server.
   */
  language: string;
  /**
   * Path to the document in the JupyterLab space
   */
  document: string;
  /**
   * LSP capabilities describing currently supported features
   */
  capabilities: ClientCapabilities;

  hasLspSupportedFile: boolean;
}

export interface IDocumentConnectionData {
  virtualDocument: VirtualDocument;
  connection: ILSPConnection;
}

export interface ILSPDocumentConnectionManager {
  /**
   * The mapping of document uri to the  connection to language server.
   */
  connections: Map<VirtualDocument.uri, ILSPConnection>;

  /**
   * The mapping of document uri to the virtual document.
   */
  documents: Map<VirtualDocument.uri, VirtualDocument>;

  /**
   * The mapping of document uri to the widget adapter.
   */
  adapters: Map<string, WidgetLSPAdapter<IDocumentWidget>>;

  /**
   * Signal emitted when a connection is connected.
   */
  connected: ISignal<ILSPDocumentConnectionManager, IDocumentConnectionData>;

  /**
   * Signal emitted when a connection is disconnected.
   */
  disconnected: ISignal<ILSPDocumentConnectionManager, IDocumentConnectionData>;

  /**
   * Signal emitted when the language server is initialized.
   */
  initialized: ISignal<ILSPDocumentConnectionManager, IDocumentConnectionData>;

  /**
   * Signal emitted when a virtual document is closed.
   */
  closed: ISignal<ILSPDocumentConnectionManager, IDocumentConnectionData>;

  /**
   * Signal emitted when the content of a virtual document is changed.
   */
  documentsChanged: ISignal<
    ILSPDocumentConnectionManager,
    Map<VirtualDocument.uri, VirtualDocument>
  >;

  /**
   * The language server manager instance.
   */
  languageServerManager: ILanguageServerManager;

  /**
   * A promise that is fulfilled when the connection manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Handles the settings that do not require an existing connection
   * with a language server (or can influence to which server the
   * connection will be created, e.g. `rank`).
   *
   * This function should be called **before** initialization of servers.
   */
  updateConfiguration(allServerSettings: TLanguageServerConfigurations): void;

  /**
   * Handles the settings that the language servers accept using
   * `onDidChangeConfiguration` messages, which should be passed under
   * the "serverSettings" keyword in the setting registry.
   * Other configuration options are handled by `updateConfiguration` instead.
   *
   * This function should be called **after** initialization of servers.
   */
  updateServerConfigurations(
    allServerSettings: TLanguageServerConfigurations
  ): void;

  /**
   * Retry to connect to the server each `reconnectDelay` seconds
   * and for `retrialsLeft` times.
   */
  retryToConnect(
    options: ISocketConnectionOptions,
    reconnectDelay: number,
    retrialsLeft: number
  ): Promise<void>;

  /**
   * Create a new connection to the language server
   * @return A promise of the LSP connection
   */
  connect(
    options: ISocketConnectionOptions,
    firstTimeoutSeconds?: number,
    secondTimeoutMinute?: number
  ): Promise<ILSPConnection | undefined>;

  /**
   * Disconnect the connection to the language server of the requested
   * language.
   */
  disconnect(languageId: TLanguageServerId): void;

  /**
   * Disconnect the signals of requested virtual document.
   */
  unregisterDocument(virtualDocument: VirtualDocument): void;

  /**
   * Register a widget adapter.
   *
   * @param  path - path to current document widget of input adapter
   * @param  adapter - the adapter need to be registered
   */
  registerAdapter(
    path: string,
    adapter: WidgetLSPAdapter<IDocumentWidget>
  ): void;
}

export interface IFeature {
  /**
   * The feature identifier. It must be the same as the feature plugin id.
   */
  id: string;

  /**
   * LSP capabilities implemented by the feature.
   */
  capabilities?: ClientCapabilities;
}

export interface ILSPFeatureManager {
  /**
   * A read-only registry of all registered features.
   */
  readonly features: IFeature[];

  /**
   * Register the new feature (frontend capability)
   * for one or more code editor implementations.
   */
  register(feature: IFeature): void;

  featuresRegistered: ISignal<ILSPFeatureManager, IFeature>;

  clientCapabilities(): ClientCapabilities;
}

/**
 * Manages code transclusion plugins.
 */
export interface ILSPCodeExtractorsManager {
  /**
   * Get the foreign code extractors.
   */
  getExtractors(
    cellType: string,
    hostLanguage: string | null
  ): IForeignCodeExtractor[];

  /**
   * Register the extraction rules to be applied in documents with language `host_language`.
   */
  register(
    extractor: IForeignCodeExtractor,
    hostLanguage: LanguageIdentifier | null
  ): void;
}

/**
 * @alpha
 *
 * The virtual documents and language server connections manager
 * Require this token in your extension to access the associated virtual
 * document and LS connection of opened documents.
 *
 */
export const ILSPDocumentConnectionManager =
  new Token<ILSPDocumentConnectionManager>(
    '@jupyterlab/lsp:ILSPDocumentConnectionManager'
  );

/**
 * @alpha
 *
 * The language server feature manager. Require this token in your extension
 * to register the client capabilities implemented by your extension.
 *
 */
export const ILSPFeatureManager = new Token<ILSPFeatureManager>(
  '@jupyterlab/lsp:ILSPFeatureManager'
);

/**
 * @alpha
 *
 * The code extractor manager. Require this token in your extension to
 * register new code extractors. Code extractor allows creating multiple
 * virtual documents from an opened document.
 *
 */
export const ILSPCodeExtractorsManager = new Token<ILSPCodeExtractorsManager>(
  '@jupyterlab/lsp:ILSPCodeExtractorsManager'
);

export interface ILSPOptions extends ILspOptions {
  capabilities: ClientCapabilities;
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
  [Method.ClientRequest.HOVER]: lsp.Hover | null;
  [Method.ClientRequest.IMPLEMENTATION]: AnyLocation;
  [Method.ClientRequest.INITIALIZE]: lsp.InitializeResult;
  [Method.ClientRequest.REFERENCES]: lsp.Location[] | null;
  [Method.ClientRequest.RENAME]: lsp.WorkspaceEdit;
  [Method.ClientRequest.SIGNATURE_HELP]: lsp.SignatureHelp;
  [Method.ClientRequest.TYPE_DEFINITION]: AnyLocation;
}

export type ServerNotifications<
  T extends keyof IServerNotifyParams = keyof IServerNotifyParams
> = {
  readonly // ISignal does not have emit, which is intended - client cannot emit server notifications.
  [key in T]: ISignal<ILSPConnection, IServerNotifyParams[key]>;
};

export type ClientNotifications<
  T extends keyof IClientNotifyParams = keyof IClientNotifyParams
> = {
  readonly // Signal has emit.
  [key in T]: Signal<ILSPConnection, IClientNotifyParams[key]>;
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
      connection?: ILSPConnection
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

export interface ILSPConnection extends ILspConnection {
  /**
   * @alpha
   *
   * Identifier of the language server
   */
  serverIdentifier?: string;

  /**
   * @alpha
   *
   * Language of the language server
   */
  serverLanguage?: string;

  /**
   * @alpha
   *
   * Should log all communication?
   */
  logAllCommunication: boolean;

  /**
   * @alpha
   *
   * Is the language server is ready?
   */
  isReady: boolean;

  /**
   * @alpha
   *
   * Notifications comes from the client.
   */
  clientNotifications: ClientNotifications;

  /**
   * @alpha
   *
   * Notifications comes from the server.
   */
  serverNotifications: ServerNotifications;

  /**
   * @alpha
   *
   * Requests comes from the client.
   */
  clientRequests: ClientRequests;

  /**
   * @alpha
   *
   * Responses comes from the server.
   */
  serverRequests: ServerRequests;

  /**
   * @alpha
   *
   * Send save notification to the server.
   */
  sendSaved(documentInfo: IDocumentInfo): void;

  /**
   * @alpha
   *
   * Send the open request to the backend when the server is
   * ready.
   */
  sendOpenWhenReady(documentInfo: IDocumentInfo): void;

  /**
   * @alpha
   *
   * Send all changes to the server.
   */
  sendFullTextChange(text: string, documentInfo: IDocumentInfo): void;

  /**
   * @alpha
   *
   * Get send request to the server to get completion results
   * from a completion item
   */
  getCompletion(
    location: IPosition,
    token: ITokenInfo,
    documentInfo: IDocumentInfo,
    emit?: boolean,
    triggerCharacter?: string,
    triggerKind?: lsp.CompletionTriggerKind
  ): Promise<lsp.CompletionItem[] | undefined>;
}
