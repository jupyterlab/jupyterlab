import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CellType } from '@jupyterlab/nbformat';
import { ServerConnection } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';

import { LanguageServer2 as LSPLanguageServerSettings } from './_plugin';
import * as SCHEMA from './_schema';
import { WidgetAdapter } from './adapters/adapter';
import { ILSPConnection } from './connection';
import { IForeignCodeExtractor } from './extractors/types';
import { ClientCapabilities, LanguageIdentifier } from './lsp';
import { VirtualDocument } from './virtual/document';

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

export interface ILanguageServerManager {
  /**
   * Signal emitted when the language server sessions are changed.
   *
   */
  sessionsChanged: ISignal<ILanguageServerManager, void>;

  /**
   * The current session information of running language servers.
   */
  sessions: TSessionMap;

  /**
   * An ordered list of matching >running< sessions, with servers of higher priority higher in the list
   */
  getMatchingServers(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TLanguageServerId[];

  /**
   * A list of all known matching specs (whether detected or not).
   */
  getMatchingSpecs(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TSpecsMap;

  /**
   * Set the configuration for language servers
   *
   */
  setConfiguration(configuration: TLanguageServerConfigurations): void;

  /**
   * Send a request to language server handler to get the session information.
   *
   */
  fetchSessions(): Promise<void>;

  /**
   * Current endpoint to get the status of running language servers
   */
  statusUrl: string;

  /**
   *
   * Status code of the `fetchSession` request.
   */
  statusCode: number;
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
  adapters: Map<string, WidgetAdapter<IDocumentWidget>>;

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
   * Handles the settings that do not require an existing connection
   * with a language server (or can influence to which server the
   * connection will be created, e.g. `priority`).
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
   *
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
   *
   */
  disconnect(languageId: TLanguageServerId): void;

  /**
   * Disconnect the signals of requested virtual document.
   *
   */
  unregisterDocument(virtualDocument: VirtualDocument): void;

  /**
   * Register a widget adapter.
   *
   * @param  path - path to current document widget of input adapter
   * @param  adapter - the adapter need to be registered
   */
  registerAdapter(path: string, adapter: WidgetAdapter<IDocumentWidget>): void;
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
    cellType: CellType,
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

export const ILSPDocumentConnectionManager =
  new Token<ILSPDocumentConnectionManager>(
    '@jupyterlab/lsp:ILSPDocumentConnectionManager'
  );

export const ILSPFeatureManager = new Token<ILSPFeatureManager>(
  '@jupyterlab/lsp:ILSPFeatureManager'
);

export const ILSPCodeExtractorsManager = new Token<ILSPCodeExtractorsManager>(
  '@jupyterlab/lsp:ILSPCodeExtractorsManager'
);
