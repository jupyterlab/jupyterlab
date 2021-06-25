import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Signal } from '@lumino/signaling';

import * as SCHEMA from './_schema';
import {
  ILanguageServerManager,
  ILSPLogConsole,
  TLanguageServerConfigurations,
  TLanguageServerId,
  TSessionMap,
  TSpecsMap
} from './tokens';

export class LanguageServerManager implements ILanguageServerManager {
  protected _sessionsChanged: Signal<ILanguageServerManager, void> = new Signal<
    ILanguageServerManager,
    void
  >(this);
  protected _sessions: TSessionMap = new Map();
  protected _specs: TSpecsMap = new Map();
  protected _version: number;
  private _settings: ServerConnection.ISettings;
  private _baseUrl: string;
  private _statusCode: number;
  private _retries: number;
  private _retriesInterval: number;
  private _configuration: TLanguageServerConfigurations;
  private _warningsEmitted = new Set<string>();
  private console: ILSPLogConsole;

  constructor(options: ILanguageServerManager.IOptions) {
    this._settings = options.settings || ServerConnection.makeSettings();
    this._baseUrl = options.baseUrl || PageConfig.getBaseUrl();
    this._retries = options.retries || 2;
    this._retriesInterval = options.retriesInterval || 10000;
    this._statusCode = null;
    this._configuration = {};
    this.console = options.console;
    this.fetchSessions().catch(console.warn);
  }

  get specs() {
    return this._specs;
  }

  get statusUrl() {
    return URLExt.join(this._baseUrl, ILanguageServerManager.URL_NS, 'status');
  }

  get sessionsChanged() {
    return this._sessionsChanged;
  }

  get sessions(): TSessionMap {
    return this._sessions;
  }

  setConfiguration(configuration: TLanguageServerConfigurations): void {
    this._configuration = configuration;
  }

  protected warnOnce(arg: string) {
    if (!this._warningsEmitted.has(arg)) {
      this._warningsEmitted.add(arg);
      this.console.warn(arg);
    }
  }

  protected _comparePriorities(a: TLanguageServerId, b: TLanguageServerId) {
    const DEFAULT_PRIORITY = 50;
    const a_priority = this._configuration[a]?.priority ?? DEFAULT_PRIORITY;
    const b_priority = this._configuration[b]?.priority ?? DEFAULT_PRIORITY;
    if (a_priority == b_priority) {
      this.warnOnce(
        `Two matching servers: ${a} and ${b} have the same priority; choose which one to use by changing the priority in Advanced Settings Editor`
      );
      return a.localeCompare(b);
    }
    // higher priority = higher in the list (descending order)
    return b_priority - a_priority;
  }

  protected isMatchingSpec(
    options: ILanguageServerManager.IGetServerIdOptions,
    spec: SCHEMA.LanguageServerSpec
  ) {
    // most things speak language
    // if language is not known, it is guessed based on MIME type earlier
    // so some language should be available by now (which can be not obvious, e.g. "plain" for txt documents)
    const lowerCaseLanguage = options.language.toLocaleLowerCase();
    return spec.languages.some(
      language => language.toLocaleLowerCase() == lowerCaseLanguage
    );
  }

  getMatchingServers(options: ILanguageServerManager.IGetServerIdOptions) {
    if (!options.language) {
      this.console.error(
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

  getMatchingSpecs(options: ILanguageServerManager.IGetServerIdOptions) {
    const result: TSpecsMap = new Map();

    for (const [key, specification] of this._specs.entries()) {
      if (this.isMatchingSpec(options, specification)) {
        result.set(key, specification);
      }
    }
    return result;
  }

  get statusCode(): number {
    return this._statusCode;
  }

  async fetchSessions() {
    let response = await ServerConnection.makeRequest(
      this.statusUrl,
      { method: 'GET' },
      this._settings
    );

    this._statusCode = response.status;

    if (!response.ok) {
      console.error('Could not fetch sessions', response);
      if (this._retries > 0) {
        this._retries -= 1;
        setTimeout(this.fetchSessions.bind(this), this._retriesInterval);
      }
      return;
    }

    let sessions: SCHEMA.Sessions;

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
      return;
    }

    for (let key of Object.keys(sessions)) {
      let id: TLanguageServerId = key as TLanguageServerId;
      if (this._sessions.has(id)) {
        Object.assign(this._sessions.get(id), sessions[key]);
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
  }
}
