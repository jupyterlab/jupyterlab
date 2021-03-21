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
import {
  CommandEntryPoint,
  ContextCommandManager,
  IContextMenuOptions
} from './command_manager';
import IEditor = CodeEditor.IEditor;
import {
  IForeignCodeExtractor,
  IForeignCodeExtractorsRegistry
} from './extractors/types';
import { LanguageIdentifier } from './lsp';

export type TLanguageServerId = string;
export type TLanguageId = string;

export type TSessionMap = Map<TLanguageServerId, SCHEMA.LanguageServerSession>;

/**
 * This is the exposed Extractor API
 *
 * Please note that this APIs can be subject to change and relocation to separate package in the future releases.
 * See https://github.com/krassowski/jupyterlab-lsp/issues/561
 */
export {
  IForeignCodeExtractorsRegistry,
  IForeignCodeExtractor,
  LanguageIdentifier
};
export { RegExpForeignCodeExtractor } from './extractors/regexp';

/**
 * Exposed Overrides API
 *
 * Please note that this APIs can be subject to change and relocation to separate package in the future releases.
 * See https://github.com/krassowski/jupyterlab-lsp/issues/561
 */
export {
  ILSPCodeOverridesManager,
  IScopedCodeOverride
} from './overrides/tokens';

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
  statusCode: number;
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
    /**
     * Number of connection retries to fetch the sessions.
     * Default 2.
     */
    retries?: number;
    /**
     * The interval for retries, default 10 seconds.
     */
    retriesInterval?: number;
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
    WidgetAdapterManager,
    IAdapterTypeOptions<IDocumentWidget>
  >;
  adapterChanged: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
  adapterDisposed: Signal<WidgetAdapterManager, WidgetAdapter<IDocumentWidget>>;
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
