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
import { ServerSpecProperties } from './_schema';

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

  constructor(options: ILanguageServerManager.IOptions) {
    this._settings = options.settings || ServerConnection.makeSettings();
    this._baseUrl = options.baseUrl || PageConfig.getBaseUrl();
    this._retries = options.retries || 2;
    this._retriesInterval = options.retriesInterval || 10000;
    this._statusCode = -1;
    this._configuration = {};
    this.fetchSessions().catch(e => console.error(e));
  }

  get specs(): TSpecsMap {
    return this._specs;
  }

  get statusUrl(): string {
    return URLExt.join(this._baseUrl, ILanguageServerManager.URL_NS, 'status');
  }

  get sessionsChanged(): ISignal<ILanguageServerManager, void> {
    return this._sessionsChanged;
  }

  get sessions(): TSessionMap {
    return this._sessions;
  }

  setConfiguration(configuration: TLanguageServerConfigurations): void {
    this._configuration = configuration;
  }

  protected warnOnce(arg: string): void {
    if (!this._warningsEmitted.has(arg)) {
      this._warningsEmitted.add(arg);
      console.warn(arg);
    }
  }

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

  getMatchingSpecs(
    options: ILanguageServerManager.IGetServerIdOptions
  ): Map<any, any> {
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

  async fetchSessions(): Promise<void> {
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

    let sessions: any;

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
