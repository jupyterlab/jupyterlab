// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '@jupyterlab/services';
import { CodeEditor } from '@jupyterlab/codeeditor';

import { FocusTracker, Widget } from '@lumino/widgets';
import { Token } from '@lumino/coreutils';
import { IDisposable, IObservableDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

import { EditorAdapter, WidgetLSPAdapter } from './adapters';
import { IForeignCodeExtractor } from './extractors/types';
import {
  AnyCompletion,
  AnyLocation,
  ClientCapabilities,
  LanguageIdentifier
} from './lsp';
import { LanguageServer1 as LSPLanguageServerSettings } from './plugin';
import * as SCHEMA from './schema';
import { VirtualDocument } from './virtual/document';
import {
  IDocumentInfo,
  ILspConnection,
  ILspOptions
} from './ws-connection/types';

import type * as rpc from 'vscode-jsonrpc';
import type * as lsp from 'vscode-languageserver-protocol';

export { IDocumentInfo };

/**
 * Example server keys==ids that are expected. The list is not exhaustive.
 * Custom server keys are allowed. Constraining the values helps avoid errors,
 * but at runtime any value is allowed.
 */
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

/**
 * Type alias for the server ids.
 */
export type TServerKeys = TLanguageServerId;

/**
 * Type of language server configuration, it is a map between server
 * id and its setting.
 */
export type TLanguageServerConfigurations = Partial<
  Record<TServerKeys, LSPLanguageServerSettings>
>;

/**
 * Type of language server session, it is a map between server
 * id and the associated session.
 */
export type TSessionMap = Map<TServerKeys, SCHEMA.LanguageServerSession>;

/**
 * Type of language server specs, it is a map between server
 * id and the associated specs.
 */
export type TSpecsMap = Map<TServerKeys, SCHEMA.LanguageServerSpec>;

/**
 * Type alias for language server id, it helps to clarify other types.
 */
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
   * Get server connection settings.
   */
  readonly settings: ServerConnection.ISettings;

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
   * Check if the manager is enabled or disabled
   */
  readonly isEnabled: boolean;

  /**
   * @alpha
   *
   * Enable the language server services
   */
  enable(): Promise<void>;

  /**
   * @alpha
   *
   * Disable the language server services
   */
  disable(): void;

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

/**
 * Virtual document namespace
 */
export namespace Document {
  /**
   * Code block description.
   */
  export interface ICodeBlockOptions {
    /**
     * CodeEditor accessor
     */
    ceEditor: IEditor;

    /**
     * Type of the cell holding this block
     */
    type: string;

    /**
     * Editor text
     *
     * #### Notes
     * This must always be available and should come from the document model directly.
     */
    value: string;
  }

  /**
   * Code editor accessor.
   */
  export interface IEditor {
    /**
     * CodeEditor getter.
     *
     * It will return `null` if the editor is not yet instantiated;
     * e.g. to support windowed notebook.
     */
    getEditor(): CodeEditor.IEditor | null;

    /**
     * Promise getter that resolved when the editor is instantiated.
     */
    ready(): Promise<CodeEditor.IEditor>;

    /**
     * Reveal the code editor in viewport.
     *
     * ### Notes
     * The promise will resolve when the editor is instantiated and in
     * the viewport.
     */
    reveal(): Promise<CodeEditor.IEditor>;
  }

  /**
   * Foreign context within code block.
   */
  export interface IForeignContext {
    /**
     * The virtual document
     */
    foreignDocument: VirtualDocument;

    /**
     * The document holding the virtual document.
     */
    parentHost: VirtualDocument;
  }

  /**
   * Virtual document block.
   */
  export interface IVirtualDocumentBlock {
    /**
     * Line corresponding to the block in the entire foreign document
     */
    virtualLine: number;

    /**
     * The virtual document holding this virtual line.
     */
    virtualDocument: VirtualDocument;

    /**
     * The CM editor associated with this virtual line.
     */
    editor: IEditor;
  }
}

export namespace ILanguageServerManager {
  /**
   * LSP endpoint prefix.
   */
  export const URL_NS = 'lsp';

  export interface IOptions {
    /**
     * The Jupyter server settings object
     */
    settings?: ServerConnection.ISettings;

    /**
     * Base URL of current JupyterLab server.
     */
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
  /**
   * The argument for getting server session or specs.
   */
  export interface IGetServerIdOptions {
    /**
     * Language server id
     */
    language?: TLanguageId;

    /**
     * Server specs mime type.
     */
    mimeType?: string;
  }
}

/**
 * Option to create the websocket connection to the LSP proxy server
 * on the backend.
 */
export interface ISocketConnectionOptions {
  /**
   * The virtual document trying to connect to the LSP server.
   */
  virtualDocument: VirtualDocument;

  /**
   * The language identifier, corresponding to the API endpoint on the
   * LSP proxy server.
   */
  language: string;

  /**
   * LSP capabilities describing currently supported features
   */
  capabilities: ClientCapabilities;

  /**
   * Is the file format is supported by LSP?
   */
  hasLspSupportedFile: boolean;
}

/**
 * @alpha
 *
 * Interface describing the LSP connection state
 */
export interface IDocumentConnectionData {
  /**
   * The virtual document connected to the language server
   */
  virtualDocument: VirtualDocument;
  /**
   * The connection between the virtual document and the language server.
   */
  connection: ILSPConnection;
}

/**
 * @alpha
 *
 * The LSP connection state manager
 */
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
   * @deprecated
   * The mapping of document uri to the widget adapter.
   */
  adapters: Map<string, WidgetLSPAdapter>;

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
   * Initial configuration for the language servers.
   */
  initialConfigurations: TLanguageServerConfigurations;

  /**
   * Handles the settings that do not require an existing connection
   * with a language server (or can influence to which server the
   * connection will be created, e.g. `rank`).
   *
   * This function should be called **before** initialization of servers.
   */
  updateConfiguration(allServerSettings: TLanguageServerConfigurations): void;

  /**
   * Enable or disable the logging of language server communication.
   */
  updateLogging(logAllCommunication: boolean, setTrace: lsp.TraceValues): void;

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
   * Disconnect the signals of requested virtual document uri.
   */
  unregisterDocument(uri: string): void;

  /**
   * @deprecated
   *
   * Register a widget adapter.
   *
   * @param  path - path to current document widget of input adapter
   * @param  adapter - the adapter need to be registered
   */
  registerAdapter(path: string, adapter: WidgetLSPAdapter): void;
}

/**
 * @alpha
 *
 * Interface describing the client feature
 */
export interface IFeature {
  /**
   * The feature identifier. It must be the same as the feature plugin id.
   */
  id: string;

  /**
   * LSP capabilities implemented by the feature.
   */
  capabilities?: ClientCapabilities;

  /**
   * Editor extension factory linked to the LSP feature.
   */
  extensionFactory?: EditorAdapter.ILSPEditorExtensionFactory;
}

/**
 * @alpha
 *
 * The LSP feature manager
 */
export interface ILSPFeatureManager {
  /**
   * A read-only registry of all registered features.
   */
  readonly features: IFeature[];

  /**
   * Signal emitted when a feature is registered
   */
  featureRegistered: ISignal<ILSPFeatureManager, IFeature>;

  /**
   * Register the new feature (frontend capability)
   * for one or more code editor implementations.
   */
  register(feature: IFeature): void;

  /**
   * Get capabilities of all registered features
   */
  clientCapabilities(): ClientCapabilities;

  /**
   * Get the extension factories of all clients.
   */
  extensionFactories(): EditorAdapter.ILSPEditorExtensionFactory[];
}

/**
 * @alpha
 *
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
 * An interface with the necessary properties from `JupyterFrontEnd.IShell`
 * for the `WidgetLSPAdapterTracker`. Used to track the active DocumentWidget.
 *
 * For more info see https://github.com/jupyterlab/jupyterlab/pull/14920#discussion_r1316507818
 * and https://github.com/jupyterlab/jupyterlab/pull/14920#discussion_r1305019718 .
 */
export interface IShell {
  /**
   * The active widget in the shell's main area.
   */
  readonly activeWidget: Widget | null;
  /**
   * A signal emitted when main area's current focus changes.
   */
  readonly currentChanged: ISignal<this, FocusTracker.IChangedArgs<Widget>>;
}

/**
 * A tracker that tracks WidgetLSPAdapters.
 *
 * @typeparam T - The type of widget being tracked. Defaults to `WidgetLSPAdapter`.
 */
export interface IWidgetLSPAdapterTracker<
  T extends WidgetLSPAdapter = WidgetLSPAdapter
> extends IDisposable {
  /**
   * A signal emitted when an adapter is added.
   */
  readonly adapterAdded: ISignal<this, T>;

  /**
   * The current adapter is the most recently focused or added adapter.
   *
   * #### Notes
   * It is the most recently focused adapter, or the most recently added
   * adapter if no adapter has taken focus.
   */
  readonly currentAdapter: T | null;

  /**
   * A signal emitted when the current instance changes.
   *
   * #### Notes
   * If the last instance being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T | null>;

  /**
   * The number of instances held by the tracker.
   */
  readonly size: number;

  /**
   * A signal emitted when a adapter is updated.
   */
  readonly adapterUpdated: ISignal<this, T>;

  /**
   * Find the first instance in the tracker that satisfies a filter function.
   *
   * @param fn The filter function to call on each instance.
   *
   * #### Notes
   * If nothing is found, the value returned is `undefined`.
   */
  find(fn: (obj: T) => boolean): T | undefined;

  /**
   * Iterate through each instance in the tracker.
   *
   * @param fn - The function to call on each instance.
   */
  forEach(fn: (obj: T) => void): void;

  /**
   * Filter the instances in the tracker based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (obj: T) => boolean): T[];

  /**
   * Check if this tracker has the specified instance.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: T): boolean;
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
    '@jupyterlab/lsp:ILSPDocumentConnectionManager',
    'Provides the virtual documents and language server connections service.'
  );

/**
 * @alpha
 *
 * The language server feature manager. Require this token in your extension
 * to register the client capabilities implemented by your extension.
 *
 */
export const ILSPFeatureManager = new Token<ILSPFeatureManager>(
  '@jupyterlab/lsp:ILSPFeatureManager',
  'Provides the language server feature manager. This token is required to register new client capabilities.'
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
  '@jupyterlab/lsp:ILSPCodeExtractorsManager',
  'Provides the code extractor manager. This token is required in your extension to register code extractor allowing the creation of multiple virtual document from an opened document.'
);

/**
 * @alpha
 *
 * The WidgetLSPAdapter tracker. Require this token in your extension to
 * track WidgetLSPAdapters.
 *
 */
export const IWidgetLSPAdapterTracker = new Token<IWidgetLSPAdapterTracker>(
  '@jupyterlab/lsp:IWidgetLSPAdapterTracker',
  'Provides the WidgetLSPAdapter tracker. This token is required in your extension to track WidgetLSPAdapters.'
);

/**
 * Argument for creating a connection to the LSP proxy server.
 */
export interface ILSPOptions extends ILspOptions {
  /**
   * Client capabilities implemented by the client.
   */
  capabilities: ClientCapabilities;

  /**
   * Language server id.
   */
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
    CODE_ACTION = 'textDocument/codeAction',
    COMPLETION = 'textDocument/completion',
    COMPLETION_ITEM_RESOLVE = 'completionItem/resolve',
    DEFINITION = 'textDocument/definition',
    DOCUMENT_COLOR = 'textDocument/documentColor',
    DOCUMENT_HIGHLIGHT = 'textDocument/documentHighlight',
    DOCUMENT_SYMBOL = 'textDocument/documentSymbol',
    HOVER = 'textDocument/hover',
    IMPLEMENTATION = 'textDocument/implementation',
    INITIALIZE = 'initialize',
    REFERENCES = 'textDocument/references',
    RENAME = 'textDocument/rename',
    SIGNATURE_HELP = 'textDocument/signatureHelp',
    TYPE_DEFINITION = 'textDocument/typeDefinition',
    LINKED_EDITING_RANGE = 'textDocument/linkedEditingRange',
    INLINE_VALUE = 'textDocument/inlineValue',
    INLAY_HINT = 'textDocument/inlayHint',
    WORKSPACE_SYMBOL = 'workspace/symbol',
    WORKSPACE_SYMBOL_RESOLVE = 'workspaceSymbol/resolve',
    FORMATTING = 'textDocument/formatting',
    RANGE_FORMATTING = 'textDocument/rangeFormatting'
  }
}

/**
 * Interface describing the notifications that come from the server.
 */
export interface IServerNotifyParams {
  [Method.ServerNotification.LOG_MESSAGE]: lsp.LogMessageParams;
  [Method.ServerNotification.LOG_TRACE]: rpc.LogTraceParams;
  [Method.ServerNotification.PUBLISH_DIAGNOSTICS]: lsp.PublishDiagnosticsParams;
  [Method.ServerNotification.SHOW_MESSAGE]: lsp.ShowMessageParams;
}

/**
 * Interface describing the notifications that come from the client.
 */
export interface IClientNotifyParams {
  [Method.ClientNotification
    .DID_CHANGE_CONFIGURATION]: lsp.DidChangeConfigurationParams;
  [Method.ClientNotification.DID_CHANGE]: lsp.DidChangeTextDocumentParams;
  [Method.ClientNotification.DID_OPEN]: lsp.DidOpenTextDocumentParams;
  [Method.ClientNotification.DID_SAVE]: lsp.DidSaveTextDocumentParams;
  [Method.ClientNotification.INITIALIZED]: lsp.InitializedParams;
  [Method.ClientNotification.SET_TRACE]: rpc.SetTraceParams;
}

/**
 * Interface describing the requests sent to the server.
 */
export interface IServerRequestParams {
  [Method.ServerRequest.REGISTER_CAPABILITY]: lsp.RegistrationParams;
  [Method.ServerRequest.SHOW_MESSAGE_REQUEST]: lsp.ShowMessageRequestParams;
  [Method.ServerRequest.UNREGISTER_CAPABILITY]: lsp.UnregistrationParams;
  [Method.ServerRequest.WORKSPACE_CONFIGURATION]: lsp.ConfigurationParams;
}

/**
 * Interface describing the responses received from the server.
 */
export interface IServerResult {
  [Method.ServerRequest.REGISTER_CAPABILITY]: void;
  [Method.ServerRequest.SHOW_MESSAGE_REQUEST]: lsp.MessageActionItem | null;
  [Method.ServerRequest.UNREGISTER_CAPABILITY]: void;
  [Method.ServerRequest.WORKSPACE_CONFIGURATION]: any[];
}

/**
 * Interface describing the request sent to the client.
 */
export interface IClientRequestParams {
  [Method.ClientRequest.CODE_ACTION]: lsp.CodeActionParams;
  [Method.ClientRequest.COMPLETION_ITEM_RESOLVE]: lsp.CompletionItem;
  [Method.ClientRequest.COMPLETION]: lsp.CompletionParams;
  [Method.ClientRequest.DEFINITION]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.DOCUMENT_COLOR]: lsp.DocumentColorParams;
  [Method.ClientRequest.DOCUMENT_HIGHLIGHT]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.DOCUMENT_SYMBOL]: lsp.DocumentSymbolParams;
  [Method.ClientRequest.HOVER]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.IMPLEMENTATION]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.INITIALIZE]: lsp.InitializeParams;
  [Method.ClientRequest.REFERENCES]: lsp.ReferenceParams;
  [Method.ClientRequest.RENAME]: lsp.RenameParams;
  [Method.ClientRequest.SIGNATURE_HELP]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.TYPE_DEFINITION]: lsp.TextDocumentPositionParams;
  [Method.ClientRequest.INLINE_VALUE]: lsp.InlineValueParams;
  [Method.ClientRequest.INLAY_HINT]: lsp.InlayHintParams;
  [Method.ClientRequest.WORKSPACE_SYMBOL]: lsp.WorkspaceSymbolParams;
  [Method.ClientRequest.WORKSPACE_SYMBOL_RESOLVE]: lsp.WorkspaceSymbol;
  [Method.ClientRequest.FORMATTING]: lsp.DocumentFormattingParams;
  [Method.ClientRequest.RANGE_FORMATTING]: lsp.DocumentRangeFormattingParams;
}

/**
 * Interface describing the responses received from the client.
 */
export interface IClientResult {
  [Method.ClientRequest.CODE_ACTION]: (lsp.Command | lsp.CodeAction)[] | null;
  [Method.ClientRequest.COMPLETION_ITEM_RESOLVE]: lsp.CompletionItem;
  [Method.ClientRequest.COMPLETION]: AnyCompletion;
  [Method.ClientRequest.DEFINITION]: AnyLocation;
  [Method.ClientRequest.DOCUMENT_COLOR]: lsp.ColorInformation[];
  [Method.ClientRequest.DOCUMENT_HIGHLIGHT]: lsp.DocumentHighlight[];
  [Method.ClientRequest.DOCUMENT_SYMBOL]: lsp.DocumentSymbol[];
  [Method.ClientRequest.HOVER]: lsp.Hover | null;
  [Method.ClientRequest.IMPLEMENTATION]: AnyLocation;
  [Method.ClientRequest.INITIALIZE]: lsp.InitializeResult;
  [Method.ClientRequest.REFERENCES]: lsp.Location[] | null;
  [Method.ClientRequest.RENAME]: lsp.WorkspaceEdit;
  [Method.ClientRequest.SIGNATURE_HELP]: lsp.SignatureHelp;
  [Method.ClientRequest.TYPE_DEFINITION]: AnyLocation;
  [Method.ClientRequest.INLINE_VALUE]: lsp.InlineValue[] | null;
  [Method.ClientRequest.INLAY_HINT]: lsp.InlayHint[] | null;
  [Method.ClientRequest.WORKSPACE_SYMBOL]:
    | lsp.SymbolInformation[]
    | lsp.WorkspaceSymbol[]
    | null;
  [Method.ClientRequest.WORKSPACE_SYMBOL_RESOLVE]: lsp.WorkspaceSymbol[];
  [Method.ClientRequest.FORMATTING]: lsp.TextEdit[] | null;
  [Method.ClientRequest.RANGE_FORMATTING]: lsp.TextEdit[] | null;
}

/**
 * Type of server notification handlers, it is a map between the server
 * notification name and the associated `ISignal`.
 */
export type ServerNotifications<
  T extends keyof IServerNotifyParams = keyof IServerNotifyParams
> = {
  readonly [key in T]: ISignal<ILSPConnection, IServerNotifyParams[key]>;
};

/**
 * Type of client notification handlers, it is a map between the client
 * notification name and the associated signal.
 */
export type ClientNotifications<
  T extends keyof IClientNotifyParams = keyof IClientNotifyParams
> = {
  readonly [key in T]: Signal<ILSPConnection, IClientNotifyParams[key]>;
};

/**
 * Interface describing the client request handler.
 */
export interface IClientRequestHandler<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> {
  request(params: IClientRequestParams[T]): Promise<IClientResult[T]>;
}

/**
 * Interface describing the server request handler.
 */
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

/**
 * Type of client request handlers, it is a map between the client
 * request name and the associated handler.
 */
export type ClientRequests<
  T extends keyof IClientRequestParams = keyof IClientRequestParams
> = {
  // has async request(params) returning a promise with result.
  readonly [key in T]: IClientRequestHandler<key>;
};

/**
 * Type of server request handlers, it is a map between the server
 * request name and the associated handler.
 */
export type ServerRequests<
  T extends keyof IServerRequestParams = keyof IServerRequestParams
> = {
  // has async request(params) returning a promise with result.
  readonly [key in T]: IServerRequestHandler<key>;
};

/**
 * @alpha
 *
 * Interface describing he connection to the language server.
 */
export interface ILSPConnection extends ILspConnection, IObservableDisposable {
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
   * Notifications that come from the client.
   */
  clientNotifications: ClientNotifications;

  /**
   * @alpha
   *
   * Notifications that come from the server.
   */
  serverNotifications: ServerNotifications;

  /**
   * @alpha
   *
   * Requests that come from the client.
   */
  clientRequests: ClientRequests;

  /**
   * @alpha
   *
   * Responses that come from the server.
   */
  serverRequests: ServerRequests;

  /**
   * @alpha
   *
   * Signal emitted when the connection is closed.
   */
  closeSignal: ISignal<ILSPConnection, boolean>;

  /**
   * @alpha
   *
   * Signal emitted when the connection receives an error
   * message..
   */
  errorSignal: ISignal<ILSPConnection, any>;

  /**
   * @alpha
   *
   * Check if a capability is available in the server capabilities.
   */
  provides(capability: keyof lsp.ServerCapabilities): boolean;

  /**
   * @alpha
   *
   * Lists server capabilities.
   */
  serverCapabilities: lsp.ServerCapabilities;

  /**
   * @alpha
   *
   * Signal emitted when the connection is initialized.
   */
  serverInitialized: ISignal<ILSPConnection, lsp.ServerCapabilities<any>>;

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
}
