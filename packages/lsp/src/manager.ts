import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';

import {
  ILanguageServerManager,
  TLanguageServerConfigurations,
  TLanguageServerId,
  TSessionMap,
  TSpecsMap
} from './tokens';
import { ServerSpecProperties } from './schema';
import { PromiseDelegate } from '@lumino/coreutils';

export class LanguageServerManager implements ILanguageServerManager {
  constructor(options: ILanguageServerManager.IOptions) {
    this._settings = options.settings || ServerConnection.makeSettings();
    this._baseUrl = options.baseUrl || PageConfig.getBaseUrl();
    this._retries = options.retries || 2;
    this._retriesInterval = options.retriesInterval || 10000;
    this._statusCode = -1;
    this._configuration = {};

    this.fetchSessions().catch(e => console.log(e));
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
   * Update the language server configuration.
   */
  setConfiguration(configuration: TLanguageServerConfigurations): void {
    this._configuration = configuration;
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
  protected _comparePriorities(
    a: TLanguageServerId,
    b: TLanguageServerId
  ): number {
    const DEFAULT_PRIORITY = 50;
    const aPriority = this._configuration[a]?.priority ?? DEFAULT_PRIORITY;
    const bPriority = this._configuration[b]?.priority ?? DEFAULT_PRIORITY;
    if (aPriority == bPriority) {
      this.warnOnce(
        `Two matching servers: ${a} and ${b} have the same priority; choose which one to use by changing the priority in Advanced Settings Editor`
      );
      return a.localeCompare(b);
    }
    // higher priority = higher in the list (descending order)
    return bPriority - aPriority;
  }

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
   * Get matching language server for input language option.
   *
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

    return matchingSessionsKeys.sort(this._comparePriorities.bind(this));
  }

  /**
   * Get matching language server spec for input language option.
   *
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
    let response = await ServerConnection.makeRequest(
      this.statusUrl,
      { method: 'GET' },
      this._settings
    );

    this._statusCode = response.status;
    if (!response.ok) {
      // if(response.status === 404){
      //   this._retries = -1
      // }
      if (this._retries > 0) {
        this._retries -= 1;
        setTimeout(this.fetchSessions.bind(this), this._retriesInterval);
      } else {
        this._ready.resolve(undefined);
        console.log('Missing jupyter_lsp server extension, skipping.');
      }
      return;
    }

    let sessions: { [key: string]: any };

    try {
      const data = await response.json();
      sessions = data.sessions;
      try {
        this._version = data.version;
        this._specs = new Map(Object.entries(data.specs)) as TSpecsMap;
      } catch (err) {
        console.warn(err);
      }
    } catch (err) {
      console.warn(err);
      this._ready.resolve(undefined);
      return;
    }

    for (let key of Object.keys(sessions)) {
      let id: TLanguageServerId = key as TLanguageServerId;
      if (this._sessions.has(id)) {
        Object.assign(this._sessions.get(id)!, sessions[key]);
      } else {
        this._sessions.set(id, sessions[key]);
      }
    }

    const oldKeys = this._sessions.keys();

    for (const oldKey in oldKeys) {
      if (!sessions[oldKey]) {
        let oldId = oldKey as TLanguageServerId;
        this._sessions.delete(oldId);
      }
    }
    this._sessionsChanged.emit(void 0);
    this._ready.resolve(undefined);
  }

  protected _sessionsChanged: Signal<ILanguageServerManager, void> = new Signal(
    this
  );

  /**
   * map of language server sessions.
   */
  protected _sessions: TSessionMap = new Map();

  /**
   * Map of language server specs.
   */
  protected _specs: TSpecsMap = new Map();

  /**
   * Version number of sever session.
   */
  protected _version: number;

  /**
   * Server connection setting.
   */
  private _settings: ServerConnection.ISettings;

  /**
   * Base URL to connect to the language server handler.
   */
  private _baseUrl: string;

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
}
