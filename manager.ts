import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { Signal } from '@lumino/signaling';

import * as SCHEMA from './_schema';
import { ILanguageServerManager, TSessionMap } from './tokens';

export class LanguageServerManager implements ILanguageServerManager {
  protected _sessionsChanged: Signal<ILanguageServerManager, void> = new Signal<
    ILanguageServerManager,
    void
  >(this);
  protected _sessions: TSessionMap = new Map();
  private _settings: ServerConnection.ISettings;
  private _baseUrl: string;
  private _statusCode: number;
  private _retries: number;
  private _retriesInterval: number;

  constructor(options: ILanguageServerManager.IOptions) {
    this._settings = options.settings || ServerConnection.makeSettings();
    this._baseUrl = options.baseUrl || PageConfig.getBaseUrl();
    this._retries = options.retries || 2;
    this._retriesInterval = options.retriesInterval || 10000;
    this._statusCode = null;
    this.fetchSessions().catch(console.warn);
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

  getServerId(options: ILanguageServerManager.IGetServerIdOptions) {
    // most things speak language
    for (const [key, session] of this._sessions.entries()) {
      if (options.language) {
        if (session.spec.languages.indexOf(options.language) !== -1) {
          return key;
        }
      }
    }
    return null;
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
      sessions = (await response.json()).sessions;
    } catch (err) {
      console.warn(err);
      return;
    }

    for (const key of Object.keys(sessions)) {
      if (this._sessions.has(key)) {
        Object.assign(this._sessions.get(key), sessions[key]);
      } else {
        this._sessions.set(key, sessions[key]);
      }
    }

    const oldKeys = this._sessions.keys();

    for (const oldKey in oldKeys) {
      if (!sessions[oldKey]) {
        this._sessions.delete(oldKey);
      }
    }

    this._sessionsChanged.emit(void 0);
  }
}
