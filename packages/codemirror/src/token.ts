/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { LanguageSupport } from '@codemirror/language';
import type { Extension, StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type { ITranslator } from '@jupyterlab/translation';
import { ReadonlyJSONObject, Token } from '@lumino/coreutils';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';

/**
 * Dynamically configurable editor extension interface.
 */
export interface IConfigurableExtension<T> {
  /**
   * Create an editor extension for the provided value.
   *
   * @param value Editor extension parameter value
   * @returns The editor extension
   */
  instance(value: T): Extension;
  /**
   * Reconfigure an editor extension.
   *
   * ### Notes
   * Return `null` if the value does not trigger
   * a state effect. In particular for immutable extension.
   *
   * @param value Editor extension value
   * @returns Editor state effect
   */
  reconfigure(value: T): StateEffect<T> | null;
}

/**
 * Editor language token.
 */
export const IEditorExtensionRegistry = new Token<IEditorExtensionRegistry>(
  '@jupyterlab/codemirror:IEditorExtensionRegistry',
  `A registry for CodeMirror extension factories.`
);

/**
 * Interface of CodeMirror editor extensions handler
 *
 * ### Notes
 * This handler is instantiated for each editor to manage its own
 * set of extensions.
 */
export interface IExtensionsHandler extends IDisposable {
  /**
   * Signal triggered when the editor configuration changes.
   * It provides the mapping of the new configuration (only those that changed).
   *
   * It should result in a call to `IExtensionsHandler.reconfigureExtensions`.
   */
  readonly configChanged: ISignal<this, Record<string, any>>;

  /**
   * Get a config option for the editor.
   */
  getOption(option: string): unknown;

  /**
   * Whether the option exists or not.
   */
  hasOption(option: string): boolean;

  /**
   * Set a config option for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `IExtensionsHandler.configChanged`.
   */
  setOption(option: string, value: unknown): void;

  /**
   * Set config options for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `IExtensionsHandler.configChanged`.
   *
   * This method is preferred when setting several options. The
   * options are set within an operation, which only performs
   * the costly update at the end, and not after every option
   * is set.
   */
  setOptions(options: Record<string, any>): void;

  /**
   * Set a base config options for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `IExtensionsHandler.configChanged`.
   */
  setBaseOptions(options: Record<string, any>): void;

  /**
   * Returns the list of initial extensions of an editor.
   *
   * @returns The initial editor extensions
   */
  getInitialExtensions(): Extension[];

  /**
   * Appends extensions to the top-level configuration of the
   * editor.
   *
   * @alpha
   * @param view Editor view
   * @param extension Editor extension to inject
   */
  injectExtension(view: EditorView, extension: Extension): void;

  /**
   * Reconfigures the extension mapped with key with the provided value.
   *
   * @param view Editor view
   * @param key Parameter unique key
   * @param value Parameter value to be applied
   */
  reconfigureExtension<T>(view: EditorView, key: string, value: T): void;

  /**
   * Reconfigures all the extensions mapped with the options from the
   * provided partial configuration.
   *
   * @param view Editor view
   * @param configuration Editor configuration
   */
  reconfigureExtensions(
    view: EditorView,
    configuration: Record<string, any>
  ): void;
}

/**
 * Editor extension factory interface.
 *
 * @template T Extension parameter type.
 */
export interface IEditorExtensionFactory<T = undefined> {
  /**
   * Editor extension unique identifier.
   */
  readonly name: string;
  /**
   * Extension factory.
   *
   * @param options
   * @returns The extension builder or null if the extension is not active for that document
   */
  readonly factory: (
    options: IEditorExtensionFactory.IOptions
  ) => IConfigurableExtension<T> | null;
  /**
   * Extension default value
   *
   * ### Notes
   * If undefined but has a schema, the default value will be `null` to be JSON serializable.
   */
  readonly default?: T;
  /**
   * JSON schema defining the configurable option through user settings.
   *
   * If this is defined, every time the setting changes, `IConfigurableExtension.reconfigure`
   * will be called with the new setting value.
   *
   * ### Notes
   * If no default value is provided, `IEditorExtensionFactory.default` will be used.
   * If the extension is to be handled by the code only, this should not be defined.
   */
  readonly schema?: ReadonlyJSONObject;
}

/**
 * CodeMirror extension factory namespace
 */
export namespace IEditorExtensionFactory {
  /**
   * CodeMirror extension factory options
   */
  export interface IOptions {
    /**
     * Whether the editor will be inline or not.
     */
    inline: boolean;
    /**
     * The model used by the editor.
     */
    model: CodeEditor.IModel;
  }
}

/**
 * Interface for generating editor configuration registry.
 */
export interface IEditorExtensionRegistry {
  /**
   * Base editor configuration
   *
   * This is the default configuration.
   */
  readonly baseConfiguration: Record<string, any>;

  /**
   * Add a default editor extension
   *
   * @template T Extension parameter type
   * @param factory Extension factory
   */
  addExtension<T>(factory: IEditorExtensionFactory<T>): void;

  /**
   * Create a new extensions handler for an editor
   *
   * @param options Extensions options and initial editor configuration
   */
  createNew(
    options: IEditorExtensionFactory.IOptions & {
      /**
       * The configuration options for the editor.
       */
      config?: Record<string, any>;
    }
  ): IExtensionsHandler;
}

/**
 * Editor factory constructor options
 */
export interface IEditorFactoryOptions {
  /**
   * Editor extensions registry
   */
  extensions?: IEditorExtensionRegistry;
  /**
   * Editor languages registry
   */
  languages?: IEditorLanguageRegistry;
  /**
   * Application translation registry
   */
  translator?: ITranslator;
}

/**
 * Editor language token.
 */
export const IEditorLanguageRegistry = new Token<IEditorLanguageRegistry>(
  '@jupyterlab/codemirror:IEditorLanguageRegistry',
  'A registry for CodeMirror languages.'
);

/**
 * The interface of a codemirror language specification.
 */
export interface IEditorLanguage {
  /**
   * Language name.
   */
  readonly name: string;
  /**
   * Language displayed name.
   */
  readonly displayName?: string;
  /**
   * Language name alias.
   */
  readonly alias?: readonly string[];
  /**
   * Language mime types.
   */
  readonly mime: string | readonly string[];
  /**
   * Language support loader.
   */
  readonly load?: () => Promise<LanguageSupport>;
  /**
   * Supported file extensions.
   */
  readonly extensions?: readonly string[];
  /**
   * Filename expression supported by the language.
   */
  readonly filename?: RegExp;
  /**
   * CodeMirror language support.
   *
   * ### Notes
   * It can provided directly or it will be obtained using `load`.
   */
  support?: LanguageSupport;
}

/**
 * Editor language interface
 */
export interface IEditorLanguageRegistry {
  /**
   * Register a new language for CodeMirror
   *
   * @param language Language to register
   */
  addLanguage(language: IEditorLanguage): void;

  /**
   * Find a codemirror language by name or CodeMirror spec.
   *
   * @param language The CodeMirror language
   * @param fallback Whether to fallback to default mimetype spec or not
   * @returns The language or null
   */
  findBest(
    language: string | IEditorLanguage,
    fallback?: boolean
  ): IEditorLanguage | null;

  /**
   * Find a codemirror language by MIME.
   *
   * @param mime Mime type to look for
   * @returns The language or null
   */
  findByMIME(mime: string | readonly string[]): IEditorLanguage | null;

  /**
   * Find a codemirror language by name.
   *
   * @param name The language name
   * @returns The language or null
   */
  findByName(name: string): IEditorLanguage | null;

  /**
   * Find a codemirror language by extension.
   *
   * @param ext The extension name
   * @returns The language or null
   */
  findByExtension(ext: string | readonly string[]): IEditorLanguage | null;

  /**
   * Find a codemirror language by filename.
   *
   * @param name File name
   * @returns The language or null
   */
  findByFileName(name: string): IEditorLanguage | null;

  /**
   * Load a CodeMirror language specified by name or Codemirror spec.
   *
   * @param language - The language to ensure.  If it is a string, uses {@link findBest}
   *   to get the appropriate spec.
   *
   * @returns A promise that resolves when the language is available.
   */
  getLanguage(
    language: string | IEditorLanguage
  ): Promise<IEditorLanguage | null>;

  /**
   * Get the raw list of available languages specs.
   *
   * @returns The available languages
   */
  getLanguages(): IEditorLanguage[];

  /**
   * Parse and style a string.
   *
   * @param code Code to highlight
   * @param language Code language
   * @param el HTML element into which the highlighted code will be inserted
   */
  highlight(
    code: string,
    language: IEditorLanguage | null,
    el: HTMLElement
  ): Promise<void>;
}

/**
 * Editor theme token.
 */
export const IEditorThemeRegistry = new Token<IEditorThemeRegistry>(
  '@jupyterlab/codemirror:IEditorThemeRegistry',
  'A registry for CodeMirror theme.'
);

/**
 * Editor theme interface
 */
export interface IEditorTheme {
  /**
   * Theme unique identifier
   */
  readonly name: string;
  /**
   * Theme name
   */
  readonly displayName?: string;
  /**
   * Editor extension for the theme
   */
  readonly theme: Extension;
}

/**
 * Theme editor registry interface
 */
export interface IEditorThemeRegistry {
  /**
   * Register a new theme.
   *
   * @param theme Codemirror 6 theme
   */
  addTheme(theme: IEditorTheme): void;

  /**
   * Get the default CodeMirror 6 theme for JupyterLab
   *
   * @returns Default theme as a CodeMirror extension
   */
  defaultTheme(): Extension;

  /**
   * Get a theme.
   *
   * #### Notes
   * It falls back to the default theme
   *
   * @param name Theme name
   * @returns Theme extension
   */
  getTheme(name: string): Extension;

  /**
   * Get all themes
   */
  readonly themes: IEditorTheme[];
}
