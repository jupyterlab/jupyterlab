import { ISignal, Signal } from '@lumino/signaling';
import { ServerConnection } from '@jupyterlab/services';

import * as SCHEMA from './_schema';
import { WidgetAdapter } from './adapters/adapter';
import { Token } from '@lumino/coreutils';
import { IFeatureOptions, ILSPExtension, LSPExtension } from './index';
import { WidgetAdapterManager } from './adapter_manager';
import { IEditorName, IFeature } from './feature';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IVirtualEditor } from './virtual/editor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { IWidgetTracker } from '@jupyterlab/apputils';
import { CommandEntryPoint, IContextMenuOptions } from './command_manager';
import IEditor = CodeEditor.IEditor;

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
  readonly features: IFeature[];
  register(options: IFeatureOptions): void;
}

export interface IAdapterRegistration {
  id: string;
  adapter: WidgetAdapter<IDocumentWidget>;
  re_connector: Function;
}

export type WidgetAdapterConstructor<T extends IDocumentWidget> = {
  new (extension: ILSPExtension, widget: T): WidgetAdapter<T>;
};

export interface IAdapterTypeOptions<T extends IDocumentWidget> {
  tracker: IWidgetTracker<T>;
  name: string;
  adapter: WidgetAdapterConstructor<T>;
  entrypoint: CommandEntryPoint;
  context_menu: IContextMenuOptions;

  get_id(widget: T): string;
}

export interface ILSPAdapterManager {
  adapterChanged: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  adapterDisposed: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  currentAdapter: WidgetAdapter<IDocumentWidget>;
  isAnyActive: () => boolean;
  // TODO: make async, return promises?
  registerExtension(extension: LSPExtension): void;
  registerAdapterType(options: IAdapterTypeOptions<IDocumentWidget>): void;
  readonly types: IAdapterTypeOptions<IDocumentWidget>[];
}

export interface IVirtualEditorType<T extends IEditor> {
  implementation: IVirtualEditor.Constructor;
  name: IEditorName;
  supports: new (...args: any) => T;
}

export interface ILSPVirtualEditorManager {
  registerEditorType(options: IVirtualEditorType<IEditor>): void;

  /**
   * Choose the most appropriate VirtualEditor implementation
   * given all the editors occurring in the widget.
   */
  findBestImplementation(
    editors: CodeEditor.IEditor[]
  ): IVirtualEditorType<any>;
}

export const PLUGIN_ID = '@krassowski/jupyterlab-lsp';

export const ILSPFeatureManager = new Token<ILSPFeatureManager>(
  PLUGIN_ID + ':ILSPFeatureManager'
);

export const ILSPAdapterManager = new Token<ILSPAdapterManager>(
  PLUGIN_ID + ':ILSPAdapterManager'
);

export const ILSPVirtualEditorManager = new Token<ILSPVirtualEditorManager>(
  PLUGIN_ID + ':ILSPVirtualEditorManager'
);
