import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { Signal } from '@lumino/signaling';
import type * as protocol from 'vscode-languageserver-protocol';

import { AskServersToSendTraceNotifications } from './_plugin';
import type * as ConnectionModuleType from './connection';
import {
  ILSPLogConsole,
  ILanguageServerManager,
  TLanguageServerConfigurations,
  TLanguageServerId,
  TServerKeys
} from './tokens';
import { expandDottedPaths, sleep, until_ready } from './utils';
import { IForeignContext, VirtualDocument } from './virtual/document';

export interface IDocumentConnectionData {
  virtual_document: VirtualDocument;
  connection: ConnectionModuleType.LSPConnection;
}

export interface ISocketConnectionOptions {
  virtual_document: VirtualDocument;
  /**
   * The language identifier, corresponding to the API endpoint on the LSP proxy server.
   */
  language: string;
  /**
   * Path to the document in the JupyterLab space
   */
  document_path: string;
}

/**
 * Each Widget with a document (whether file or a notebook) has the same DocumentConnectionManager
 * (see JupyterLabWidgetAdapter). Using id_path instead of uri led to documents being overwritten
 * as two identical id_paths could be created for two different notebooks.
 */
export class DocumentConnectionManager {
  connections: Map<VirtualDocument.uri, ConnectionModuleType.LSPConnection>;
  documents: Map<VirtualDocument.uri, VirtualDocument>;
  initialized: Signal<DocumentConnectionManager, IDocumentConnectionData>;
  connected: Signal<DocumentConnectionManager, IDocumentConnectionData>;
  /**
   * Connection temporarily lost or could not be fully established; a re-connection will be attempted;
   */
  disconnected: Signal<DocumentConnectionManager, IDocumentConnectionData>;
  /**
   * Connection was closed permanently and no-reconnection will be attempted, e.g.:
   *  - there was a serious server error
   *  - user closed the connection,
   *  - re-connection attempts exceeded,
   */
  closed: Signal<DocumentConnectionManager, IDocumentConnectionData>;
  documents_changed: Signal<
    DocumentConnectionManager,
    Map<VirtualDocument.uri, VirtualDocument>
  >;
  language_server_manager: ILanguageServerManager;
  initial_configurations: TLanguageServerConfigurations;
  private ignored_languages: Set<string>;
  private readonly console: ILSPLogConsole;

  constructor(options: DocumentConnectionManager.IOptions) {
    this.connections = new Map();
    this.documents = new Map();
    this.ignored_languages = new Set();
    this.connected = new Signal(this);
    this.initialized = new Signal(this);
    this.disconnected = new Signal(this);
    this.closed = new Signal(this);
    this.documents_changed = new Signal(this);
    this.language_server_manager = options.language_server_manager;
    this.console = options.console;
    Private.setLanguageServerManager(options.language_server_manager);
  }

  connect_document_signals(virtual_document: VirtualDocument) {
    virtual_document.foreign_document_opened.connect(
      this.on_foreign_document_opened,
      this
    );

    virtual_document.foreign_document_closed.connect(
      this.on_foreign_document_closed,
      this
    );

    this.documents.set(virtual_document.uri, virtual_document);
    this.documents_changed.emit(this.documents);
  }

  disconnect_document_signals(virtual_document: VirtualDocument, emit = true) {
    virtual_document.foreign_document_opened.disconnect(
      this.on_foreign_document_opened,
      this
    );

    virtual_document.foreign_document_closed.disconnect(
      this.on_foreign_document_closed,
      this
    );

    this.documents.delete(virtual_document.uri);
    for (const foreign of virtual_document.foreign_documents.values()) {
      this.disconnect_document_signals(foreign, false);
    }

    if (emit) {
      this.documents_changed.emit(this.documents);
    }
  }

  on_foreign_document_opened(_host: VirtualDocument, context: IForeignContext) {
    this.console.log(
      'ConnectionManager received foreign document: ',
      context.foreign_document.uri
    );
  }

  on_foreign_document_closed(_host: VirtualDocument, context: IForeignContext) {
    const { foreign_document } = context;
    this.disconnect_document_signals(foreign_document);
  }

  private async connect_socket(
    options: ISocketConnectionOptions
  ): Promise<ConnectionModuleType.LSPConnection> {
    this.console.log('Connection Socket', options);
    let { virtual_document, language } = options;

    this.connect_document_signals(virtual_document);

    const uris = DocumentConnectionManager.solve_uris(
      virtual_document,
      language
    );

    const matchingServers = this.language_server_manager.getMatchingServers({
      language
    });
    this.console.debug('Matching servers: ', matchingServers);

    // for now use only the server with the highest priority.
    const language_server_id =
      matchingServers.length === 0 ? null : matchingServers[0];

    // lazily load 1) the underlying library (1.5mb) and/or 2) a live WebSocket-
    // like connection: either already connected or potentially in the process
    // of connecting.
    const connection = await Private.connection(
      language,
      language_server_id,
      uris,
      this.on_new_connection,
      this.console
    );

    // if connecting for the first time, all documents subsequent documents will
    // be re-opened and synced
    this.connections.set(virtual_document.uri, connection);

    return connection;
  }

  /**
   * Handles the settings that do not require an existing connection
   * with a language server (or can influence to which server the
   * connection will be created, e.g. `priority`).
   *
   * This function should be called **before** initialization of servers.
   */
  public updateConfiguration(allServerSettings: TLanguageServerConfigurations) {
    this.language_server_manager.setConfiguration(allServerSettings);
  }

  /**
   * Handles the settings that the language servers accept using
   * `onDidChangeConfiguration` messages, which should be passed under
   * the "serverSettings" keyword in the setting registry.
   * Other configuration options are handled by `updateConfiguration` instead.
   *
   * This function should be called **after** initialization of servers.
   */
  public updateServerConfigurations(
    allServerSettings: TLanguageServerConfigurations
  ) {
    let language_server_id: TServerKeys;

    for (language_server_id in allServerSettings) {
      if (!allServerSettings.hasOwnProperty(language_server_id)) {
        continue;
      }
      const rawSettings = allServerSettings[language_server_id];

      const parsedSettings = expandDottedPaths(rawSettings.serverSettings);

      const serverSettings: protocol.DidChangeConfigurationParams = {
        settings: parsedSettings
      };

      this.console.log('Server Update: ', language_server_id);
      this.console.log('Sending settings: ', serverSettings);
      Private.updateServerConfiguration(language_server_id, serverSettings);
    }
  }

  /**
   * Fired the first time a connection is opened. These _should_ be the only
   * invocation of `.on` (once remaining LSPFeature.connection_handlers are made
   * singletons).
   */
  on_new_connection = (connection: ConnectionModuleType.LSPConnection) => {
    connection.on('error', e => {
      this.console.warn(e);
      // TODO invalid now
      let error: Error = e.length && e.length >= 1 ? e[0] : new Error();
      // TODO: those codes may be specific to my proxy client, need to investigate
      if (error.message.indexOf('code = 1005') !== -1) {
        this.console.warn(`Connection failed for ${connection}`);
        this.forEachDocumentOfConnection(connection, virtual_document => {
          this.console.warn('disconnecting ' + virtual_document.uri);
          this.closed.emit({ connection, virtual_document });
          this.ignored_languages.add(virtual_document.language);

          this.console.warn(
            `Cancelling further attempts to connect ${virtual_document.uri} and other documents for this language (no support from the server)`
          );
        });
      } else if (error.message.indexOf('code = 1006') !== -1) {
        this.console.warn('Connection closed by the server');
      } else {
        this.console.error('Connection error:', e);
      }
    });

    connection.on('serverInitialized', capabilities => {
      this.forEachDocumentOfConnection(connection, virtual_document => {
        // TODO: is this still necessary, e.g. for status bar to update responsively?
        this.initialized.emit({ connection, virtual_document });
      });

      // Initialize using settings stored in the SettingRegistry
      this.updateServerConfigurations(this.initial_configurations);
    });

    connection.on('close', closed_manually => {
      if (!closed_manually) {
        this.console.warn('Connection unexpectedly disconnected');
      } else {
        this.console.warn('Connection closed');
        this.forEachDocumentOfConnection(connection, virtual_document => {
          this.closed.emit({ connection, virtual_document });
        });
      }
    });
  };

  private forEachDocumentOfConnection(
    connection: ConnectionModuleType.LSPConnection,
    callback: (virtual_document: VirtualDocument) => void
  ) {
    for (const [
      virtual_document_uri,
      a_connection
    ] of this.connections.entries()) {
      if (connection !== a_connection) {
        continue;
      }
      callback(this.documents.get(virtual_document_uri));
    }
  }

  /**
   * TODO: presently no longer referenced. A failing connection would close
   * the socket, triggering the language server on the other end to exit
   */
  public async retry_to_connect(
    options: ISocketConnectionOptions,
    reconnect_delay: number,
    retrials_left = -1
  ) {
    let { virtual_document } = options;

    if (this.ignored_languages.has(virtual_document.language)) {
      return;
    }

    let interval = reconnect_delay * 1000;
    let success = false;

    while (retrials_left !== 0 && !success) {
      await this.connect(options)
        .then(() => {
          success = true;
        })
        .catch(e => {
          this.console.warn(e);
        });

      this.console.log(
        'will attempt to re-connect in ' + interval / 1000 + ' seconds'
      );
      await sleep(interval);

      // gradually increase the time delay, up to 5 sec
      interval = interval < 5 * 1000 ? interval + 500 : interval;
    }
  }

  async connect(
    options: ISocketConnectionOptions,
    firstTimeoutSeconds = 30,
    secondTimeoutMinutes = 5
  ) {
    this.console.log('connection requested', options);
    let connection = await this.connect_socket(options);

    let { virtual_document, document_path } = options;

    if (!connection.isReady) {
      try {
        // user feedback hinted that 40 seconds was too short and some users are willing to wait more;
        // to make the best of both worlds we first check frequently (6.6 times a second) for the first
        // 30 seconds, and show the warning early in case if something is wrong; we then continue retrying
        // for another 5 minutes, but only once per second.
        await until_ready(
          () => connection.isReady,
          Math.round((firstTimeoutSeconds * 1000) / 150),
          150
        );
      } catch {
        this.console.warn(
          `Connection to ${virtual_document.uri} timed out after ${firstTimeoutSeconds} seconds, will continue retrying for another ${secondTimeoutMinutes} minutes`
        );
        try {
          await until_ready(
            () => connection.isReady,
            60 * secondTimeoutMinutes,
            1000
          );
        } catch {
          this.console.warn(
            `Connection to ${virtual_document.uri} timed out again after ${secondTimeoutMinutes} minutes, giving up`
          );
          return;
        }
      }
    }

    this.console.log(document_path, virtual_document.uri, 'connected.');

    this.connected.emit({ connection, virtual_document });

    return connection;
  }

  public unregister_document(virtual_document: VirtualDocument) {
    this.connections.delete(virtual_document.uri);
    this.documents_changed.emit(this.documents);
  }

  updateLogging(
    logAllCommunication: boolean,
    setTrace: AskServersToSendTraceNotifications
  ) {
    for (const connection of this.connections.values()) {
      connection.logAllCommunication = logAllCommunication;
      if (setTrace !== null) {
        connection.clientNotifications['$/setTrace'].emit({ value: setTrace });
      }
    }
  }
}

export namespace DocumentConnectionManager {
  export interface IOptions {
    language_server_manager: ILanguageServerManager;
    console: ILSPLogConsole;
  }

  export function solve_uris(
    virtual_document: VirtualDocument,
    language: string
  ): IURIs {
    const wsBase = PageConfig.getBaseUrl().replace(/^http/, 'ws');
    const rootUri = PageConfig.getOption('rootUri');
    const virtualDocumentsUri = PageConfig.getOption('virtualDocumentsUri');

    const baseUri = virtual_document.has_lsp_supported_file
      ? rootUri
      : virtualDocumentsUri;

    // for now take the best match only
    const matchingServers =
      Private.getLanguageServerManager().getMatchingServers({
        language
      });
    const language_server_id =
      matchingServers.length === 0 ? null : matchingServers[0];

    if (language_server_id === null) {
      throw `No language server installed for language ${language}`;
    }

    // workaround url-parse bug(s) (see https://github.com/jupyter-lsp/jupyterlab-lsp/issues/595)
    let documentUri = URLExt.join(baseUri, virtual_document.uri);
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
      socket: URLExt.join(
        wsBase,
        ILanguageServerManager.URL_NS,
        'ws',
        language_server_id
      )
    };
  }

  export interface IURIs {
    base: string;
    document: string;
    server: string;
    socket: string;
  }
}

/**
 * Namespace primarily for language-keyed cache of ConnectionModuleType.LSPConnections
 */
namespace Private {
  const _connections: Map<
    TLanguageServerId,
    ConnectionModuleType.LSPConnection
  > = new Map();
  let _promise: Promise<typeof ConnectionModuleType>;
  let _language_server_manager: ILanguageServerManager;

  export function getLanguageServerManager() {
    return _language_server_manager;
  }
  export function setLanguageServerManager(
    language_server_manager: ILanguageServerManager
  ) {
    _language_server_manager = language_server_manager;
  }

  /**
   * Return (or create and initialize) the WebSocket associated with the language
   */
  export async function connection(
    language: string,
    language_server_id: TLanguageServerId,
    uris: DocumentConnectionManager.IURIs,
    onCreate: (connection: ConnectionModuleType.LSPConnection) => void,
    console: ILSPLogConsole
  ): Promise<ConnectionModuleType.LSPConnection> {
    if (_promise == null) {
      // TODO: consider lazy-loading _only_ the modules that _must_ be webpacked
      // with custom shims, e.g. `fs`
      _promise = import(
        /* webpackChunkName: "jupyter-lsp-connection" */ './connection'
      );
    }

    const { LSPConnection } = await _promise;
    let connection = _connections.get(language_server_id);

    if (connection == null) {
      const socket = new WebSocket(uris.socket);
      const connection = new LSPConnection({
        languageId: language,
        serverUri: uris.server,
        rootUri: uris.base,
        serverIdentifier: language_server_id,
        console: console
      });
      // TODO: remove remaining unbounded users of connection.on
      connection.setMaxListeners(999);
      _connections.set(language_server_id, connection);
      connection.connect(socket);
      onCreate(connection);
    }

    connection = _connections.get(language_server_id);

    return connection;
  }

  export function updateServerConfiguration(
    language_server_id: TLanguageServerId,
    settings: protocol.DidChangeConfigurationParams
  ): void {
    const connection = _connections.get(language_server_id);
    if (connection) {
      connection.sendConfigurationChange(settings);
    }
  }
}
