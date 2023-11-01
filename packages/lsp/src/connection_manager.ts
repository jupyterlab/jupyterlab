// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import { WidgetLSPAdapter } from './adapters';
import { LSPConnection } from './connection';
import { ClientCapabilities } from './lsp';
import { AskServersToSendTraceNotifications } from './plugin';
import {
  Document,
  IDocumentConnectionData,
  ILanguageServerManager,
  ILSPConnection,
  ILSPDocumentConnectionManager,
  ISocketConnectionOptions,
  IWidgetLSPAdapterTracker,
  TLanguageServerConfigurations,
  TLanguageServerId,
  TServerKeys
} from './tokens';
import { expandDottedPaths, sleep, untilReady } from './utils';
import { VirtualDocument } from './virtual/document';

import type * as protocol from 'vscode-languageserver-protocol';

/**
 * Each Widget with a document (whether file or a notebook) has the same DocumentConnectionManager
 * (see JupyterLabWidgetAdapter). Using id_path instead of uri led to documents being overwritten
 * as two identical id_paths could be created for two different notebooks.
 */
export class DocumentConnectionManager
  implements ILSPDocumentConnectionManager
{
  constructor(options: DocumentConnectionManager.IOptions) {
    this.connections = new Map();
    this.documents = new Map();
    this.adapters = new Map();
    this._ignoredLanguages = new Set();
    this.languageServerManager = options.languageServerManager;
    Private.setLanguageServerManager(options.languageServerManager);

    options.adapterTracker.adapterAdded.connect((_, adapter) => {
      const path = adapter.widget.context.path;
      this.registerAdapter(path, adapter);
    });
  }

  /**
   * Map between the URI of the virtual document and its connection
   * to the language server
   */
  readonly connections: Map<VirtualDocument.uri, LSPConnection>;

  /**
   * @deprecated
   * Map between the path of the document and its adapter
   */
  readonly adapters: Map<string, WidgetLSPAdapter>;

  /**
   * Map between the URI of the virtual document and the document itself.
   */
  readonly documents: Map<VirtualDocument.uri, VirtualDocument>;
  /**
   * The language server manager plugin.
   */
  readonly languageServerManager: ILanguageServerManager;

  /**
   * Initial configuration for the language servers.
   */
  initialConfigurations: TLanguageServerConfigurations;

  /**
   * Signal emitted when the manager is initialized.
   */
  get initialized(): ISignal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > {
    return this._initialized;
  }

  /**
   * Signal emitted when the manager is connected to the server
   */
  get connected(): ISignal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > {
    return this._connected;
  }

  /**
   * Connection temporarily lost or could not be fully established; a re-connection will be attempted;
   */
  get disconnected(): ISignal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > {
    return this._disconnected;
  }

  /**
   * Connection was closed permanently and no-reconnection will be attempted, e.g.:
   *  - there was a serious server error
   *  - user closed the connection,
   *  - re-connection attempts exceeded,
   */
  get closed(): ISignal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > {
    return this._closed;
  }

  /**
   * Signal emitted when the document is changed.
   */
  get documentsChanged(): ISignal<
    ILSPDocumentConnectionManager,
    Map<VirtualDocument.uri, VirtualDocument>
  > {
    return this._documentsChanged;
  }

  /**
   * Promise resolved when the language server manager is ready.
   */
  get ready(): Promise<void> {
    return Private.getLanguageServerManager().ready;
  }

  /**
   * Helper to connect various virtual document signal with callbacks of
   * this class.
   *
   * @param  virtualDocument - virtual document to be connected.
   */
  connectDocumentSignals(virtualDocument: VirtualDocument): void {
    virtualDocument.foreignDocumentOpened.connect(
      this.onForeignDocumentOpened,
      this
    );

    virtualDocument.foreignDocumentClosed.connect(
      this.onForeignDocumentClosed,
      this
    );
    this.documents.set(virtualDocument.uri, virtualDocument);
    this._documentsChanged.emit(this.documents);
  }

  /**
   * Helper to disconnect various virtual document signal with callbacks of
   * this class.
   *
   * @param  virtualDocument - virtual document to be disconnected.
   */
  disconnectDocumentSignals(
    virtualDocument: VirtualDocument,
    emit = true
  ): void {
    virtualDocument.foreignDocumentOpened.disconnect(
      this.onForeignDocumentOpened,
      this
    );

    virtualDocument.foreignDocumentClosed.disconnect(
      this.onForeignDocumentClosed,
      this
    );
    this.documents.delete(virtualDocument.uri);
    for (const foreign of virtualDocument.foreignDocuments.values()) {
      this.disconnectDocumentSignals(foreign, false);
    }

    if (emit) {
      this._documentsChanged.emit(this.documents);
    }
  }

  /**
   * Handle foreign document opened event.
   */
  onForeignDocumentOpened(
    _host: VirtualDocument,
    context: Document.IForeignContext
  ): void {
    /** no-op */
  }

  /**
   * Handle foreign document closed event.
   */
  onForeignDocumentClosed(
    _host: VirtualDocument,
    context: Document.IForeignContext
  ): void {
    const { foreignDocument } = context;
    this.unregisterDocument(foreignDocument.uri, false);
    this.disconnectDocumentSignals(foreignDocument);
  }

  /**
   * @deprecated
   *
   * Register a widget adapter with this manager
   *
   * @param  path - path to the inner document of the adapter
   * @param  adapter - the adapter to be registered
   */
  registerAdapter(path: string, adapter: WidgetLSPAdapter): void {
    this.adapters.set(path, adapter);

    adapter.widget.context.pathChanged.connect((context, newPath) => {
      this.adapters.delete(path);
      this.adapters.set(newPath, adapter);
    });

    adapter.disposed.connect(() => {
      if (adapter.virtualDocument) {
        this.documents.delete(adapter.virtualDocument.uri);
      }
      this.adapters.delete(path);
    });
  }

  /**
   * Handles the settings that do not require an existing connection
   * with a language server (or can influence to which server the
   * connection will be created, e.g. `rank`).
   *
   * This function should be called **before** initialization of servers.
   */
  updateConfiguration(allServerSettings: TLanguageServerConfigurations): void {
    this.languageServerManager.setConfiguration(allServerSettings);
  }

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
  ): void {
    let languageServerId: TServerKeys;

    for (languageServerId in allServerSettings) {
      if (!allServerSettings.hasOwnProperty(languageServerId)) {
        continue;
      }
      const rawSettings = allServerSettings[languageServerId]!;

      const parsedSettings = expandDottedPaths(rawSettings.configuration || {});

      const serverSettings: protocol.DidChangeConfigurationParams = {
        settings: parsedSettings
      };

      Private.updateServerConfiguration(languageServerId, serverSettings);
    }
  }

  /**
   * Fired the first time a connection is opened. These _should_ be the only
   * invocation of `.on` (once remaining LSPFeature.connection_handlers are made
   * singletons).
   */
  onNewConnection = (connection: LSPConnection): void => {
    const errorSignalSlot = (_: ILSPConnection, e: any): void => {
      console.error(e);
      let error: Error = e.length && e.length >= 1 ? e[0] : new Error();
      if (error.message.indexOf('code = 1005') !== -1) {
        console.error(`Connection failed for ${connection}`);
        this._forEachDocumentOfConnection(connection, virtualDocument => {
          console.error('disconnecting ' + virtualDocument.uri);
          this._closed.emit({ connection, virtualDocument });
          this._ignoredLanguages.add(virtualDocument.language);
          console.error(
            `Cancelling further attempts to connect ${virtualDocument.uri} and other documents for this language (no support from the server)`
          );
        });
      } else if (error.message.indexOf('code = 1006') !== -1) {
        console.error('Connection closed by the server');
      } else {
        console.error('Connection error:', e);
      }
    };
    connection.errorSignal.connect(errorSignalSlot);

    const serverInitializedSlot = (): void => {
      // Initialize using settings stored in the SettingRegistry
      this._forEachDocumentOfConnection(connection, virtualDocument => {
        // TODO: is this still necessary, e.g. for status bar to update responsively?
        this._initialized.emit({ connection, virtualDocument });
      });
      this.updateServerConfigurations(this.initialConfigurations);
    };
    connection.serverInitialized.connect(serverInitializedSlot);

    const closeSignalSlot = (_: ILSPConnection, closedManually: boolean) => {
      if (!closedManually) {
        console.error('Connection unexpectedly disconnected');
      } else {
        console.log('Connection closed');
        this._forEachDocumentOfConnection(connection, virtualDocument => {
          this._closed.emit({ connection, virtualDocument });
        });
      }
    };
    connection.closeSignal.connect(closeSignalSlot);
  };

  /**
   * Retry to connect to the server each `reconnectDelay` seconds
   * and for `retrialsLeft` times.
   * TODO: presently no longer referenced. A failing connection would close
   * the socket, triggering the language server on the other end to exit.
   */
  async retryToConnect(
    options: ISocketConnectionOptions,
    reconnectDelay: number,
    retrialsLeft = -1
  ): Promise<void> {
    let { virtualDocument } = options;

    if (this._ignoredLanguages.has(virtualDocument.language)) {
      return;
    }

    let interval = reconnectDelay * 1000;
    let success = false;

    while (retrialsLeft !== 0 && !success) {
      await this.connect(options)
        .then(() => {
          success = true;
        })
        .catch(e => {
          console.warn(e);
        });

      console.log(
        'will attempt to re-connect in ' + interval / 1000 + ' seconds'
      );
      await sleep(interval);

      // gradually increase the time delay, up to 5 sec
      interval = interval < 5 * 1000 ? interval + 500 : interval;
    }
  }

  /**
   * Disconnect the connection to the language server of the requested
   * language.
   */
  disconnect(languageId: TLanguageServerId): void {
    Private.disconnect(languageId);
  }

  /**
   * Create a new connection to the language server
   * @return A promise of the LSP connection
   */
  async connect(
    options: ISocketConnectionOptions,
    firstTimeoutSeconds = 30,
    secondTimeoutMinutes = 5
  ): Promise<ILSPConnection | undefined> {
    let connection = await this._connectSocket(options);
    let { virtualDocument } = options;
    if (!connection) {
      return;
    }
    if (!connection.isReady) {
      try {
        // user feedback hinted that 40 seconds was too short and some users are willing to wait more;
        // to make the best of both worlds we first check frequently (6.6 times a second) for the first
        // 30 seconds, and show the warning early in case if something is wrong; we then continue retrying
        // for another 5 minutes, but only once per second.
        await untilReady(
          () => connection!.isReady,
          Math.round((firstTimeoutSeconds * 1000) / 150),
          150
        );
      } catch {
        console.log(
          `Connection to ${virtualDocument.uri} timed out after ${firstTimeoutSeconds} seconds, will continue retrying for another ${secondTimeoutMinutes} minutes`
        );
        try {
          await untilReady(
            () => connection!.isReady,
            60 * secondTimeoutMinutes,
            1000
          );
        } catch {
          console.log(
            `Connection to ${virtualDocument.uri} timed out again after ${secondTimeoutMinutes} minutes, giving up`
          );
          return;
        }
      }
    }

    this._connected.emit({ connection, virtualDocument });

    return connection;
  }

  /**
   * Disconnect the signals of requested virtual document URI.
   */
  unregisterDocument(uri: string, emit: boolean = true): void {
    const connection = this.connections.get(uri);
    if (connection) {
      this.connections.delete(uri);
      const allConnection = new Set(this.connections.values());

      if (!allConnection.has(connection)) {
        this.disconnect(connection.serverIdentifier as TLanguageServerId);
        connection.dispose();
      }
      if (emit) {
        this._documentsChanged.emit(this.documents);
      }
    }
  }

  /**
   * Enable or disable the logging of language server communication.
   */
  updateLogging(
    logAllCommunication: boolean,
    setTrace: AskServersToSendTraceNotifications
  ): void {
    for (const connection of this.connections.values()) {
      connection.logAllCommunication = logAllCommunication;
      if (setTrace !== null) {
        connection.clientNotifications['$/setTrace'].emit({ value: setTrace });
      }
    }
  }

  /**
   * Create the LSP connection for requested virtual document.
   *
   * @return  Return the promise of the LSP connection.
   */

  private async _connectSocket(
    options: ISocketConnectionOptions
  ): Promise<LSPConnection | undefined> {
    let { language, capabilities, virtualDocument } = options;

    this.connectDocumentSignals(virtualDocument);

    const uris = DocumentConnectionManager.solveUris(virtualDocument, language);
    const matchingServers = this.languageServerManager.getMatchingServers({
      language
    });

    // for now use only the server with the highest rank.
    const languageServerId =
      matchingServers.length === 0 ? null : matchingServers[0];

    // lazily load 1) the underlying library (1.5mb) and/or 2) a live WebSocket-
    // like connection: either already connected or potentially in the process
    // of connecting.
    if (!uris) {
      return;
    }
    const connection = await Private.connection(
      language,
      languageServerId!,
      uris,
      this.onNewConnection,
      capabilities
    );

    // if connecting for the first time, all documents subsequent documents will
    // be re-opened and synced
    this.connections.set(virtualDocument.uri, connection);

    return connection;
  }

  /**
   * Helper to apply callback on all documents of a connection.
   */
  private _forEachDocumentOfConnection(
    connection: ILSPConnection,
    callback: (virtualDocument: VirtualDocument) => void
  ) {
    for (const [
      virtualDocumentUri,
      currentConnection
    ] of this.connections.entries()) {
      if (connection !== currentConnection) {
        continue;
      }
      callback(this.documents.get(virtualDocumentUri)!);
    }
  }

  private _initialized: Signal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > = new Signal(this);

  private _connected: Signal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > = new Signal(this);

  private _disconnected: Signal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > = new Signal(this);

  private _closed: Signal<
    ILSPDocumentConnectionManager,
    IDocumentConnectionData
  > = new Signal(this);

  private _documentsChanged: Signal<
    ILSPDocumentConnectionManager,
    Map<VirtualDocument.uri, VirtualDocument>
  > = new Signal(this);

  /**
   * Set of ignored languages
   */
  private _ignoredLanguages: Set<string>;
}

export namespace DocumentConnectionManager {
  export interface IOptions {
    /**
     * The language server manager instance.
     */
    languageServerManager: ILanguageServerManager;

    /**
     * The WidgetLSPAdapter's tracker.
     */
    adapterTracker: IWidgetLSPAdapterTracker;
  }

  /**
   * Generate the URI of a virtual document from input
   *
   * @param  virtualDocument - the virtual document
   * @param  language - language of the document
   */
  export function solveUris(
    virtualDocument: VirtualDocument,
    language: string
  ): IURIs | undefined {
    const serverManager = Private.getLanguageServerManager();
    const wsBase = serverManager.settings.wsUrl;
    const rootUri = PageConfig.getOption('rootUri');
    const virtualDocumentsUri = PageConfig.getOption('virtualDocumentsUri');

    // for now take the best match only
    const serverOptions: ILanguageServerManager.IGetServerIdOptions = {
      language
    };
    const matchingServers = serverManager.getMatchingServers(serverOptions);
    const languageServerId =
      matchingServers.length === 0 ? null : matchingServers[0];

    if (languageServerId === null) {
      return;
    }

    const specs = serverManager.getMatchingSpecs(serverOptions);
    const spec = specs.get(languageServerId);
    if (!spec) {
      console.warn(
        `Specification not available for server ${languageServerId}`
      );
    }
    const requiresOnDiskFiles = spec?.requires_documents_on_disk ?? true;
    const supportsInMemoryFiles = !requiresOnDiskFiles;

    const baseUri =
      virtualDocument.hasLspSupportedFile || supportsInMemoryFiles
        ? rootUri
        : virtualDocumentsUri;

    // workaround url-parse bug(s) (see https://github.com/jupyter-lsp/jupyterlab-lsp/issues/595)
    let documentUri = URLExt.join(baseUri, virtualDocument.uri);
    if (
      !documentUri.startsWith('file:///') &&
      documentUri.startsWith('file://')
    ) {
      documentUri = documentUri.replace('file://', 'file:///');
      if (
        documentUri.startsWith('file:///users/') &&
        baseUri.startsWith('file:///Users/')
      ) {
        documentUri = documentUri.replace('file:///users/', 'file:///Users/');
      }
    }

    return {
      base: baseUri,
      document: documentUri,
      server: URLExt.join('ws://jupyter-lsp', language),
      socket: URLExt.join(wsBase, 'lsp', 'ws', languageServerId)
    };
  }

  export interface IURIs {
    /**
     * The root URI set by server.
     *
     */
    base: string;

    /**
     * The URI to the virtual document.
     *
     */
    document: string;

    /**
     * Address of websocket endpoint for LSP services.
     *
     */
    server: string;

    /**
     * Address of websocket endpoint for the language server.
     *
     */
    socket: string;
  }
}

/**
 * Namespace primarily for language-keyed cache of LSPConnections
 */
namespace Private {
  const _connections: Map<TLanguageServerId, LSPConnection> = new Map();
  let _languageServerManager: ILanguageServerManager;

  export function getLanguageServerManager(): ILanguageServerManager {
    return _languageServerManager;
  }
  export function setLanguageServerManager(
    languageServerManager: ILanguageServerManager
  ): void {
    _languageServerManager = languageServerManager;
  }

  export function disconnect(languageServerId: TLanguageServerId): void {
    const connection = _connections.get(languageServerId);
    if (connection) {
      connection.close();
      _connections.delete(languageServerId);
    }
  }

  /**
   * Return (or create and initialize) the WebSocket associated with the language
   */
  export async function connection(
    language: string,
    languageServerId: TLanguageServerId,
    uris: DocumentConnectionManager.IURIs,
    onCreate: (connection: LSPConnection) => void,
    capabilities: ClientCapabilities
  ): Promise<LSPConnection> {
    let connection = _connections.get(languageServerId);
    if (!connection) {
      const { settings } = Private.getLanguageServerManager();
      const socket = new settings.WebSocket(uris.socket);
      const connection = new LSPConnection({
        languageId: language,
        serverUri: uris.server,
        rootUri: uris.base,
        serverIdentifier: languageServerId,
        capabilities: capabilities
      });

      _connections.set(languageServerId, connection);
      connection.connect(socket);
      onCreate(connection);
    }

    connection = _connections.get(languageServerId)!;

    return connection;
  }

  export function updateServerConfiguration(
    languageServerId: TLanguageServerId,
    settings: protocol.DidChangeConfigurationParams
  ): void {
    const connection = _connections.get(languageServerId);
    if (connection) {
      connection.sendConfigurationChange(settings);
    }
  }
}
