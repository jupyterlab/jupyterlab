import { ISignal } from '@lumino/signaling';
import { ServerConnection } from '@jupyterlab/services';

import * as SCHEMA from './_schema';

export type TLanguageServerId = string;
export type TLanguageId = string;

export type TSessionMap = Map<TLanguageServerId, SCHEMA.LanguageServerSession>;

/**
 * TODO: Should this support custom server keys?
 */
export type TServerKeys =
  | 'pyls'
  | 'bash-language-server'
  | 'dockerfile-language-server-nodejs'
  | 'javascript-typescript-langserver'
  | 'unified-language-server'
  | 'vscode-css-languageserver-bin'
  | 'vscode-html-languageserver-bin'
  | 'vscode-json-languageserver-bin'
  | 'yaml-language-server'
  | 'r-languageserver';

export type TLanguageServerConfigurations = {
  [k in TServerKeys]: {
    serverSettings: any;
  };
};

export interface ILanguageServerManager {
  sessionsChanged: ISignal<ILanguageServerManager, void>;
  sessions: TSessionMap;
  getServerId(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TLanguageServerId;
  fetchSessions(): Promise<void>;
  statusUrl: string;
}

export interface ILanguageServerConfiguration {
  /**
   * The config params must be nested inside the settings keyword
   */
  settings: {
    [k: string]: any;
  };
}

export namespace ILanguageServerManager {
  export const URL_NS = 'lsp';
  export interface IOptions {
    settings?: ServerConnection.ISettings;
    baseUrl?: string;
  }
  export interface IGetServerIdOptions {
    language?: TLanguageId;
    mimeType?: string;
  }
}
