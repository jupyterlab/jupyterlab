import { IWidgetTracker } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ServerConnection } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import { LanguageServer2 as LSPLanguageServerSettings } from './_plugin';
import * as SCHEMA from './_schema';
import { WidgetAdapter } from './adapters/adapter';
import {
  CommandEntryPoint,
  ContextCommandManager,
  IContextMenuOptions
} from './command_manager';
import {
  IForeignCodeExtractor,
  IForeignCodeExtractorsRegistry
} from './extractors/types';
import { IEditorName, IFeature } from './feature';
import { LanguageIdentifier } from './lsp';
import { IVirtualEditor } from './virtual/editor';

import { IFeatureOptions, ILSPExtension, LSPExtension } from './index';

import IEditor = CodeEditor.IEditor;

export type TLanguageId = string;

/**
 * Example server keys==ids that are expected. The list is not exhaustive.
 * Custom server keys are allowed. Constraining the values helps avoid errors,
 * but at runtime any value is allowed.
 */
export type TLanguageServerId =
  | 'pylsp'
  | 'bash-language-server'
  | 'dockerfile-language-server-nodejs'
  | 'javascript-typescript-langserver'
  | 'unified-language-server'
  | 'vscode-css-languageserver-bin'
  | 'vscode-html-languageserver-bin'
  | 'vscode-json-languageserver-bin'
  | 'yaml-language-server'
  | 'r-languageserver';
export type TServerKeys = TLanguageServerId;

export type TSessionMap = Map<TServerKeys, SCHEMA.LanguageServerSession>;
export type TSpecsMap = Map<TServerKeys, SCHEMA.LanguageServerSpec>;

export type TLanguageServerConfigurations = Partial<
  Record<TServerKeys, LSPLanguageServerSettings>
>;

export interface ILanguageServerManager {
  sessionsChanged: ISignal<ILanguageServerManager, void>;
  sessions: TSessionMap;
  /**
   * An ordered list of matching >running< sessions, with servers of higher priority higher in the list
   */
  getMatchingServers(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TLanguageServerId[];

  /**
   * A list of all known matching specs (whether detected or not).
   */
  getMatchingSpecs(
    options: ILanguageServerManager.IGetServerIdOptions
  ): TSpecsMap;
  setConfiguration(configuration: TLanguageServerConfigurations): void;
  fetchSessions(): Promise<void>;
  statusUrl: string;
  statusCode: number;
}

export namespace ILanguageServerManager {
  export const URL_NS = 'lsp';
  export interface IOptions {
    settings?: ServerConnection.ISettings;
    baseUrl?: string;
    /**
     * Number of connection retries to fetch the sessions.
     * Default 2.
     */
    retries?: number;
    /**
     * The interval for retries, default 10 seconds.
     */
    retriesInterval?: number;
    console: ILSPLogConsole;
  }
  export interface IGetServerIdOptions {
    language?: TLanguageId;
    mimeType?: string;
  }
}

export interface ILSPFeatureManager {
  /**
   * A read-only registry of all registered features.
   */
  readonly features: IFeature[];

  /**
   * Register the new feature (frontend capability)
   * for one or more code editor implementations.
   */
  register(options: IFeatureOptions): void;
  /**
   * Register the context command manager. Should not be used directly
   * by the features - pass our commands in `IFeature.commands` instead.
   */
  registerCommandManager(manager: ContextCommandManager): void;
}

export interface IAdapterRegistration {
  id: string;
  adapter: WidgetAdapter<IDocumentWidget>;
  re_connector: () => void;
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
  adapterTypeAdded: Signal<
    ILSPAdapterManager,
    IAdapterTypeOptions<IDocumentWidget>
  >;
  adapterChanged: Signal<ILSPAdapterManager, WidgetAdapter<IDocumentWidget>>;
  adapterDisposed: Signal<ILSPAdapterManager, WidgetAdapter<IDocumentWidget>>;
  currentAdapter: WidgetAdapter<IDocumentWidget>;
  isAnyActive: () => boolean;
  registerExtension(extension: LSPExtension): void;
  registerAdapterType(options: IAdapterTypeOptions<IDocumentWidget>): void;
  readonly types: IAdapterTypeOptions<IDocumentWidget>[];
}

export interface IVirtualEditorType<T extends IEditor> {
  /**
   * The constructor of the IVirtualEditor<T> instance.
   */
  implementation: IVirtualEditor.Constructor;
  /**
   * The name of the editor T.
   */
  name: IEditorName;
  /**
   * The implementation of and editor being supported.
   */
  supports: new (...args: any) => T;
}

export interface ILogConsoleCore {
  debug(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export interface ILSPLogConsole extends ILogConsoleCore {
  scope(scope: string): ILSPLogConsole;
}

export interface ILSPVirtualEditorManager {
  /**
   * Register editor type implementation.
   */
  registerEditorType(options: IVirtualEditorType<IEditor>): void;

  /**
   * Choose the most appropriate VirtualEditor implementation
   * given all the editors occurring in the widget.
   */
  findBestImplementation(
    editors: CodeEditor.IEditor[]
  ): IVirtualEditorType<any>;
}

/**
 * Manages code transclusion plugins.
 */
export interface ILSPCodeExtractorsManager {
  /**
   * Global registry of the foreign code extractors.
   */
  registry: IForeignCodeExtractorsRegistry;

  /**
   * Register the extraction rules to be applied in documents with language `host_language`.
   */
  register(
    extractor: IForeignCodeExtractor,
    host_language: LanguageIdentifier
  ): void;
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

export const ILSPCodeExtractorsManager = new Token<ILSPCodeExtractorsManager>(
  PLUGIN_ID + ':ILSPCodeExtractorsManager'
);

export const ILSPLogConsole = new Token<ILSPLogConsole>(
  PLUGIN_ID + ':ILSPLogConsole'
);
