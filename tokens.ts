import { ISignal, Signal } from '@lumino/signaling';
import { ServerConnection } from '@jupyterlab/services';

import * as SCHEMA from './_schema';
import { WidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import { IDocumentWidget } from '@jupyterlab/docregistry/lib/registry';
import { Token } from '@lumino/coreutils';
import { IFeatureOptions, WidgetAdapterManager } from './index';

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

export interface ILSPFeatureManager {
  register(options: IFeatureOptions): void;
}

export interface IAdapterRegistration {
  id: string;
  adapter: WidgetAdapter<IDocumentWidget>;
  type: 'notebook' | 'file-editor';
  re_connector: Function;
}

export interface ILSPAdapterManager {
  adapterChanged: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  adapterDisposed: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  currentAdapter: WidgetAdapter<IDocumentWidget>;
  isAnyActive: () => boolean;
  register: (options: IAdapterRegistration) => void;
}

export const PLUGIN_ID = '@krassowski/jupyterlab-lsp';

export const ILSPFeatureManager = new Token<ILSPFeatureManager>(
  PLUGIN_ID + ':ILSPFeatureManager'
);

export const ILSPAdapterManager = new Token<ILSPAdapterManager>(
  PLUGIN_ID + ':ILSPWidgetAdapterManager'
);
