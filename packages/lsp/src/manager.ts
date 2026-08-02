// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { DisposableDelegate } from '@lumino/disposable';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import type {
  ILanguageServerProvider,
  TLanguageServerConfigurations,
  TLanguageServerId,
  TSessionMap,
  TSpecsMap
} from './tokens';
import { ILanguageServerManager } from './tokens';
import type { ServerSpecProperties } from './schema';

interface IProviderRegistration {
  provider: ILanguageServerProvider;
  onSessionsChanged: () => void;
}

export class LanguageServerManager implements ILanguageServerManager {
  constructor(options: ILanguageServerManager.IOptions) {
    this._settings = options.settings || ServerConnection.makeSettings();
    this._baseUrlOverride = options.baseUrl;
    this._retries = options.retries || 2;
    this._retriesInterval = options.retriesInterval || 10000;
    this._statusCode = -1;
    this._configuration = {};

    this.fetchSessions().catch(e => console.log(e));
  }

  /**
   * Check if the manager is enabled or disabled
   */
  get isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Check if the manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Get server connection settings.
   */
  get settings() {
    return this._settings;
  }

  /**
   * Get the language server specs.
   */
  get specs(): TSpecsMap {
    return this._specs;
  }

  /**
   * Get the status end point.
   */
  get statusUrl(): string {
    return URLExt.join(this._baseUrl, ILanguageServerManager.URL_NS, 'status');
  }

  /**
   * Signal emitted when a  language server session is changed
   */
  get sessionsChanged(): ISignal<ILanguageServerManager, void> {
    return this._sessionsChanged;
  }

  /**
   * Get the map of language server sessions.
   */
  get sessions(): TSessionMap {
    return this._sessions;
  }

  /**
   * A promise resolved when this server manager is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Get the status code of server's responses.
   */
  get statusCode(): number {
    return this._statusCode;
  }

  /**
   * Enable the language server services
   */
  async enable(): Promise<void> {
    this._enabled = true;
    await this.fetchSessions();
  }

  /**
   * Disable the language server services
   */
  disable(): void {
    this._enabled = false;
    this._sessions = new Map();
    this._specs = new Map();
    this._serverSessions = new Map();
    this._serverSpecs = new Map();
    this._transports.clear();
    this._sessionsChanged.emit(void 0);
  }

  /**
   * Dispose the manager.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;

    for (const registration of this._providers.values()) {
      if (registration.provider.sessionsChanged) {
        registration.provider.sessionsChanged.disconnect(
          registration.onSessionsChanged
        );
      }
    }
    this._providers.clear();
    this._serverSessions.clear();
    this._serverSpecs.clear();
    this._transports.clear();

    Signal.clearData(this);
  }

  /**
   * Update the language server configuration.
   */
  setConfiguration(configuration: TLanguageServerConfigurations): void {
    this._configuration = configuration;
  }

  /**
   * Register a runtime language server provider.
   */
  registerProvider(provider: ILanguageServerProvider): IDisposable {
    if (this._providers.has(provider.id)) {
      console.warn(
        `Language server provider with id ${provider.id} is already registered`
      );
      return new DisposableDelegate(() => undefined);
    }

    const registration = {
      provider,
      onSessionsChanged: () => {
        void this.fetchSessions().catch(console.error);
      }
    };
    this._providers.set(provider.id, registration);

    if (provider.sessionsChanged) {
      provider.sessionsChanged.connect(registration.onSessionsChanged);
    }

    void this.fetchSessions().catch(console.error);

    return new DisposableDelegate(() => {
      if (this._providers.get(provider.id) !== registration) {
        return;
      }
      if (provider.sessionsChanged) {
        provider.sessionsChanged.disconnect(registration.onSessionsChanged);
      }
      this._providers.delete(provider.id);
      void this.fetchSessions().catch(console.error);
    });
  }

  /**
   * Get a runtime transport factory for a language server.
   */
  getTransportFactory(
    languageServerId: TLanguageServerId
  ): ILanguageServerProvider.TTransportFactory | null {
    return this._transports.get(languageServerId) ?? null;
  }

  /**
   * Get matching language server for input language option.
   */
  getMatchingServers(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TLanguageServerId[] {
    if (!options.language) {
      console.error(
        'Cannot match server by language: language not available; ensure that kernel and specs provide language and MIME type'
      );
      return [];
    }

    const matchingSessionsKeys: TLanguageServerId[] = [];

    for (const [key, session] of this._sessions.entries()) {
      if (this.isMatchingSpec(options, session.spec)) {
        matchingSessionsKeys.push(key);
      }
    }

    return matchingSessionsKeys.sort(this.compareRanks.bind(this));
  }

  /**
   * Get matching language server spec for input language option.
   */
  getMatchingSpecs(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TSpecsMap {
    const result: TSpecsMap = new Map();

    for (const [key, specification] of this._specs.entries()) {
      if (this.isMatchingSpec(options, specification)) {
        result.set(key, specification);
      }
    }
    return result;
  }

  /**
   * Fetch the server session list from the status endpoint. The server
   * manager is ready once this method finishes.
   */
  async fetchSessions(): Promise<void> {
    if (!this._enabled) {
      return;
    }
    let statusCode = this._statusCode;
    const sessions: TSessionMap = new Map();
    const specs: TSpecsMap = new Map();
    const transports = new Map<
      TLanguageServerId,
      ILanguageServerProvider.TTransportFactory
    >();

    const serverData = await this._fetchServerData();
    if (serverData?.statusCode !== undefined) {
      statusCode = serverData.statusCode;
      this._statusCode = statusCode;
    }
    if (serverData?.retryScheduled && this._providers.size === 0) {
      return;
    }
    if (serverData?.sessions !== undefined) {
      this._syncSnapshot(this._serverSessions, serverData.sessions);
    }
    if (serverData?.specs !== undefined) {
      this._syncSnapshot(this._serverSpecs, serverData.specs);
    }
    if (serverData) {
      if (serverData.version !== undefined) {
        this.version = serverData.version;
      }
    }

    this._mergeSnapshot(specs, this._serverSpecs);
    this._mergeSnapshot(sessions, this._serverSessions);

    for (const registration of this._providers.values()) {
      try {
        const data = await registration.provider.fetch();
        if (!data) {
          continue;
        }
        if (data.statusCode !== undefined) {
          statusCode = data.statusCode;
        }
        this._mergeSnapshot(specs, data.specs);
        this._mergeSnapshot(sessions, data.sessions);
        if (data.transport) {
          for (const [key, factory] of Object.entries(data.transport)) {
            transports.set(key as TLanguageServerId, factory);
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    this._statusCode = statusCode;
    this._transports = transports;
    this._syncSnapshot(this._specs, specs);
    this._syncSnapshot(this._sessions, sessions);
    this._sessionsChanged.emit(void 0);
    this._ready.resolve(undefined);
  }

  /**
   * Version number of sever session.
   */
  protected version: number;

  /**
   * Check if input language option maths the language server spec.
   */
  protected isMatchingSpec(
    options: ILanguageServerManager.IGetServerIdOptions,
    spec: ServerSpecProperties
  ): boolean {
    // most things speak language
    // if language is not known, it is guessed based on MIME type earlier
    // so some language should be available by now (which can be not so obvious, e.g. "plain" for txt documents)
    const lowerCaseLanguage = options.language!.toLocaleLowerCase();
    return spec.languages!.some(
      (language: string) => language.toLocaleLowerCase() == lowerCaseLanguage
    );
  }

  /**
   * Helper function to warn a message only once.
   */
  protected warnOnce(arg: string): void {
    if (!this._warningsEmitted.has(arg)) {
      this._warningsEmitted.add(arg);
      console.warn(arg);
    }
  }

  /**
   * Compare the rank of two servers with the same language.
   */
  protected compareRanks(a: TLanguageServerId, b: TLanguageServerId): number {
    const DEFAULT_RANK = 50;
    const aRank = this._configuration[a]?.rank ?? DEFAULT_RANK;
    const bRank = this._configuration[b]?.rank ?? DEFAULT_RANK;
    if (aRank == bRank) {
      this.warnOnce(
        `Two matching servers: ${a} and ${b} have the same rank; choose which one to use by changing the rank in Advanced Settings Editor`
      );
      return a.localeCompare(b);
    }
    // higher rank = higher in the list (descending order)
    return bRank - aRank;
  }

  /**
   * Fetch language server data from the HTTP endpoint.
   */
  private async _fetchServerData(): Promise<
    | (ILanguageServerProvider.IFetchResult & {
        version?: number;
        retryScheduled?: boolean;
      })
    | null
  > {
    let response: Response;

    try {
      response = await ServerConnection.makeRequest(
        this.statusUrl,
        { method: 'GET' },
        this._settings
      );
    } catch (err) {
      console.warn(err);
      return null;
    }

    if (!response.ok) {
      if (this._retries > 0) {
        this._retries -= 1;
        setTimeout(this.fetchSessions.bind(this), this._retriesInterval);
        return { statusCode: response.status, retryScheduled: true };
      } else {
        console.log('Missing jupyter_lsp server extension, skipping.');
      }
      return { statusCode: response.status };
    }

    try {
      const data = await response.json();
      return {
        statusCode: response.status,
        version: data.version,
        sessions: data.sessions,
        specs: data.specs
      };
    } catch (err) {
      console.warn(err);
      return { statusCode: response.status };
    }
  }

  /**
   * Merge provider snapshot into target map.
   */
  private _mergeSnapshot<T>(
    target: Map<TLanguageServerId, T>,
    source?: Map<TLanguageServerId, T> | { [key: string]: T }
  ): void {
    if (!source) {
      return;
    }
    const entries =
      source instanceof Map ? source.entries() : Object.entries(source);

    for (const [key, value] of entries) {
      target.set(key as TLanguageServerId, value);
    }
  }

  /**
   * Synchronize a mutable map in place.
   */
  private _syncSnapshot<T>(
    target: Map<TLanguageServerId, T>,
    source: Map<TLanguageServerId, T> | { [key: string]: T }
  ): void {
    const entries =
      source instanceof Map ? source.entries() : Object.entries(source);
    const nextKeys = new Set<TLanguageServerId>();

    for (const [key, value] of entries) {
      const id = key as TLanguageServerId;
      nextKeys.add(id);
      target.set(id, value);
    }
    for (const key of Array.from(target.keys())) {
      if (!nextKeys.has(key)) {
        target.delete(key);
      }
    }
  }

  /**
   * Get the base URL for language server requests.
   */
  private get _baseUrl(): string {
    return this._baseUrlOverride || this._settings.baseUrl;
  }

  /**
   * map of language server sessions.
   */
  private _sessions: TSessionMap = new Map();

  /**
   * Map of language server specs.
   */
  private _specs: TSpecsMap = new Map();

  /**
   * Last known language server sessions from HTTP status endpoint.
   */
  private _serverSessions: TSessionMap = new Map();

  /**
   * Last known language server specs from HTTP status endpoint.
   */
  private _serverSpecs: TSpecsMap = new Map();

  /**
   * Server connection setting.
   */
  private _settings: ServerConnection.ISettings;

  /**
   * Base URL to connect to the language server handler.
   */
  private _baseUrlOverride: string | undefined;

  /**
   * Status code of server response
   */
  private _statusCode: number;

  /**
   * Number of connection retry, default to 2.
   */
  private _retries: number;

  /**
   * Interval between each retry, default to 10s.
   */
  private _retriesInterval: number;

  /**
   * Language server configuration.
   */
  private _configuration: TLanguageServerConfigurations;

  /**
   * Set of emitted warning message, message in this set will not be warned again.
   */
  private _warningsEmitted = new Set<string>();

  /**
   * A promise resolved when this server manager is ready.
   */
  private _ready = new PromiseDelegate<void>();

  /**
   * Signal emitted when a  language server session is changed
   */
  private _sessionsChanged: Signal<ILanguageServerManager, void> = new Signal(
    this
  );

  /**
   * Runtime language server providers.
   */
  private _providers = new Map<string, IProviderRegistration>();

  /**
   * Runtime language server transport factories.
   */
  private _transports = new Map<
    TLanguageServerId,
    ILanguageServerProvider.TTransportFactory
  >();

  private _isDisposed = false;

  /**
   * Check if the manager is enabled or disabled
   */
  private _enabled = true;
}
