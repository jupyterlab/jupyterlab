// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
  indentUnit
} from '@codemirror/language';
import {
  Compartment,
  EditorState,
  Extension,
  Prec,
  StateEffect
} from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightSpecialChars,
  highlightTrailingWhitespace,
  highlightWhitespace,
  KeyBinding,
  keymap,
  lineNumbers,
  rectangularSelection,
  scrollPastEnd,
  tooltips
} from '@codemirror/view';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONExt, ReadonlyJSONObject } from '@lumino/coreutils';
import { IObservableDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { StateCommands } from './commands';
import { customTheme, CustomTheme, rulers } from './extensions';
import {
  IConfigurableExtension,
  IEditorExtensionFactory,
  IEditorExtensionRegistry,
  IEditorThemeRegistry,
  IExtensionsHandler
} from './token';
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  openSearchPanel,
  selectSelectionMatches
} from '@codemirror/search';

/**
 * The class name added to read only editor widgets.
 */
const READ_ONLY_CLASS = 'jp-mod-readOnly';

/**
 * Editor configuration handler options
 */
export interface IEditorHandlerOptions {
  /**
   * The base configuration options for all editor.
   */
  baseConfiguration?: Record<string, any>;
  /**
   * The configuration options for the editor.
   *
   * They take precedence over the base configuration.
   */
  config?: Record<string, any>;
  /**
   * Editor default extensions.
   *
   * Extension defined in the mapping without a base configuration
   * will not be configurable.
   */
  defaultExtensions?: [string, IConfigurableExtension<any>][];
}

/**
 * Editor configuration handler
 *
 * It stores the editor configuration and the editor extensions.
 * It also allows to inject new extensions into an editor.
 */
export class ExtensionsHandler
  implements IExtensionsHandler, IObservableDisposable
{
  constructor({
    baseConfiguration,
    config,
    defaultExtensions
  }: IEditorHandlerOptions = {}) {
    this._baseConfig = baseConfiguration ?? {};
    this._config = config ?? {};

    this._configurableBuilderMap = new Map<string, IConfigurableExtension<any>>(
      defaultExtensions
    );

    const configurables = Object.keys(this._config).concat(
      Object.keys(this._baseConfig)
    );
    this._immutables = new Set(
      [...this._configurableBuilderMap.keys()].filter(
        key => !configurables.includes(key)
      )
    );
  }

  /**
   * Signal triggered when the editor configuration changes.
   * It provides the mapping of the new configuration (only those that changed).
   *
   * It should result in a call to `IExtensionsHandler.reconfigureExtensions`.
   */
  get configChanged(): ISignal<this, Record<string, any>> {
    return this._configChanged;
  }

  /**
   * A signal emitted when the object is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Tests whether the object is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Get a config option for the editor.
   */
  getOption(option: string): unknown {
    return this._config[option] ?? this._baseConfig[option];
  }

  /**
   * Whether the option exists or not.
   */
  hasOption(option: string): boolean {
    return (
      Object.keys(this._config).includes(option) ||
      Object.keys(this._baseConfig).includes(option)
    );
  }

  /**
   * Set a config option for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `IExtensionsHandler.configChanged`.
   */
  setOption(option: string, value: unknown): void {
    // Don't bother setting the option if it is already the same.
    if (this._config[option] !== value) {
      this._config[option] = value;
      this._configChanged.emit({ [option]: value });
    }
  }

  /**
   * Set a base config option for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `IExtensionsHandler.configChanged`.
   */
  setBaseOptions(options: Record<string, any>): void {
    // Change values of baseConfig
    const changed = this._getChangedOptions(options, this._baseConfig);
    if (changed.length > 0) {
      this._baseConfig = options;
      const customizedKeys = Object.keys(this._config);
      const notOverridden = changed.filter(k => !customizedKeys.includes(k));
      if (notOverridden.length > 0) {
        this._configChanged.emit(
          notOverridden.reduce<Record<string, any>>((agg, key) => {
            agg[key] = this._baseConfig[key];
            return agg;
          }, {})
        );
      }
    }
    // Change values of config keys if present in options
    for (const key of Object.keys(options)) {
      if (key in this._config && this._config[key] != options[key]) {
        this.setOption(key, options[key]);
      }
    }
  }

  /**
   * Set config options for the editor.
   *
   * You will need to reconfigure the editor extensions by listening
   * to `EditorHandler.configChanged`.
   *
   * This method is preferred when setting several options. The
   * options are set within an operation, which only performs
   * the costly update at the end, and not after every option
   * is set.
   */
  setOptions(options: Record<string, any>): void {
    const changed = this._getChangedOptions(options, this._config);
    if (changed.length > 0) {
      this._config = { ...options };
      this._configChanged.emit(
        changed.reduce<Record<string, any>>((agg, key) => {
          agg[key] = this._config[key] ?? this._baseConfig[key];
          return agg;
        }, {})
      );
    }
  }

  /**
   * Reconfigures the extension mapped with key with the provided value.
   *
   * @param view Editor view
   * @param key Parameter unique key
   * @param value Parameter value to be applied
   */
  reconfigureExtension<T>(view: EditorView, key: string, value: T): void {
    const effect = this.getEffect<T>(view.state, key, value);

    if (effect) {
      view.dispatch({
        effects: [effect]
      });
    }
  }

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
  ): void {
    const effects = Object.keys(configuration)
      .filter(key => this.has(key))
      .map(key => this.getEffect(view.state, key, configuration[key]));

    view.dispatch({
      effects: effects.filter(
        effect => effect !== null
      ) as StateEffect<unknown>[]
    });
  }

  /**
   * Appends extensions to the top-level configuration of the
   * editor.
   *
   * Injected extension cannot be removed.
   *
   * ### Notes
   * You should prefer registering a IEditorExtensionFactory instead
   * of this feature.
   *
   * @alpha
   * @param view Editor view
   * @param extension Editor extension to inject
   */
  injectExtension(view: EditorView, extension: Extension): void {
    view.dispatch({
      effects: StateEffect.appendConfig.of(extension)
    });
  }

  /**
   * Returns the list of initial extensions of an editor
   * based on the configuration.
   *
   * @returns The initial editor extensions
   */
  getInitialExtensions(): Extension[] {
    const configuration = { ...this._baseConfig, ...this._config };

    const extensions = [...this._immutables]
      .map(key => this.get(key)?.instance(undefined))
      .filter(ext => ext) as Extension[];
    for (const k of Object.keys(configuration)) {
      const builder = this.get(k);
      if (builder) {
        const value = configuration[k];
        extensions.push(builder.instance(value));
      }
    }

    return extensions;
  }

  /**
   * Get a extension builder
   * @param key Extension unique identifier
   * @returns The extension builder
   */
  protected get(key: string): IConfigurableExtension<any> | undefined {
    return this._configurableBuilderMap.get(key);
  }

  /**
   * Whether the editor has an extension for the identifier.
   *
   * @param key Extension unique identifier
   * @returns Extension existence
   */
  protected has(key: string): boolean {
    return this._configurableBuilderMap.has(key);
  }

  protected getEffect<T>(
    state: EditorState,
    key: string,
    value: T
  ): StateEffect<unknown> | null {
    const builder = this.get(key);
    return builder?.reconfigure(value) ?? null;
  }

  private _getChangedOptions(
    newConfig: Record<string, any>,
    oldConfig: Record<string, any>
  ): string[] {
    const changed = new Array<string>();
    const newKeys = new Array<string>();
    for (const [key, value] of Object.entries(newConfig)) {
      newKeys.push(key);
      if (oldConfig[key] !== value) {
        changed.push(key);
      }
    }
    // Add removed old keys
    changed.push(...Object.keys(oldConfig).filter(k => !newKeys.includes(k)));

    return changed;
  }

  private _baseConfig: Record<string, any>;
  private _config: Record<string, any>;
  private _configChanged = new Signal<this, Record<string, any>>(this);
  private _configurableBuilderMap: Map<string, IConfigurableExtension<any>>;
  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _immutables = new Set<string>();
}

/**
 * CodeMirror extensions registry
 */
export class EditorExtensionRegistry implements IEditorExtensionRegistry {
  /**
   * Base editor configuration
   *
   * This is the default configuration optionally modified by the user;
   * e.g. through user settings.
   */
  get baseConfiguration(): Record<string, any> {
    return { ...this.defaultOptions, ...this._baseConfiguration };
  }
  set baseConfiguration(v: Record<string, any>) {
    if (!JSONExt.deepEqual(v, this._baseConfiguration)) {
      this._baseConfiguration = v;
      for (const handler of this.handlers) {
        handler.setBaseOptions(this.baseConfiguration);
      }
    }
  }

  /**
   * Default editor configuration
   *
   * This is the default configuration as defined when extensions
   * are registered.
   */
  get defaultConfiguration(): Record<string, any> {
    // Only options with schema should be JSON serializable
    // So we cannot use `JSONExt.deepCopy` on the default options.
    return Object.freeze({ ...this.defaultOptions });
  }

  /**
   * Editor configuration JSON schema
   */
  get settingsSchema(): ReadonlyJSONObject {
    return Object.freeze(JSONExt.deepCopy(this.configurationSchema));
  }

  /**
   * Add a default editor extension
   *
   * @template T Extension parameter type
   * @param factory Extension factory
   */
  addExtension<T>(factory: IEditorExtensionFactory<T>): void {
    if (this.configurationBuilder.has(factory.name)) {
      throw new Error(`Extension named ${factory.name} is already registered.`);
    }

    this.configurationBuilder.set(factory.name, factory);
    if (typeof factory.default != 'undefined') {
      this.defaultOptions[factory.name] = factory.default;
    }
    if (factory.schema) {
      this.configurationSchema[factory.name] = {
        default: factory.default ?? null,
        ...factory.schema
      };
      this.defaultOptions[factory.name] =
        this.configurationSchema[factory.name].default;
    }
  }

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
  ): IExtensionsHandler {
    const configuration = new Array<[string, IConfigurableExtension<any>]>();
    for (const [key, builder] of this.configurationBuilder.entries()) {
      const extension = builder.factory(options);
      if (extension) {
        configuration.push([key, extension]);
      }
    }

    const handler = new ExtensionsHandler({
      baseConfiguration: this.baseConfiguration,
      config: options.config,
      defaultExtensions: configuration
    });

    this.handlers.add(handler);
    handler.disposed.connect(() => {
      this.handlers.delete(handler);
    });

    return handler;
  }
  protected configurationBuilder = new Map<
    string,
    IEditorExtensionFactory<any>
  >();
  protected configurationSchema: Record<string, any> = {};

  protected defaultOptions: Record<string, any> = {};
  protected handlers = new Set<ExtensionsHandler>();
  protected immutableExtensions = new Set<string>();
  private _baseConfiguration: Record<string, any> = {};
}

/**
 * Editor extension registry namespace
 */
export namespace EditorExtensionRegistry {
  /**
   * Dynamically configurable editor extension.
   */
  class ConfigurableExtension<T> implements IConfigurableExtension<T> {
    /**
     * Create a dynamic editor extension.
     *
     * @param builder Extension builder
     */
    constructor(builder: (value: T) => Extension) {
      this._compartment = new Compartment();
      this._builder = builder;
    }

    /**
     * Create an editor extension for the provided value.
     *
     * @param value Editor extension parameter value
     * @returns The editor extension
     */
    instance(value: T): Extension {
      return this._compartment.of(this._builder(value));
    }

    /**
     * Reconfigure an editor extension.
     *
     * @param value Editor extension value
     * @returns Editor state effect
     */
    reconfigure(value: T): StateEffect<T> {
      return this._compartment.reconfigure(
        this._builder(value)
      ) as StateEffect<T>;
    }

    private _compartment: Compartment;
    private _builder: (value: T) => Extension;
  }

  /**
   * Immutable editor extension class
   */
  class ImmutableExtension implements IConfigurableExtension<undefined> {
    /**
     * Create an immutable editor extension.
     *
     * @param extension Extension
     */
    constructor(extension: Extension) {
      this._extension = extension;
    }

    /**
     * Create an editor extension.
     *
     * @returns The editor extension
     */
    instance(): Extension {
      return this._extension;
    }

    /**
     * Reconfigure an editor extension.
     *
     * This is a no-op
     */
    reconfigure(): null {
      // This is a no-op
      return null;
    }

    private _extension: Extension;
  }

  /**
   * Creates a dynamically configurable editor extension.
   *
   * @param builder Extension builder
   * @return The extension
   */
  export function createConfigurableExtension<T>(
    builder: (value: T) => Extension
  ): IConfigurableExtension<T> {
    return new ConfigurableExtension<T>(builder);
  }

  /**
   * Creates a configurable extension returning
   * one of two extensions depending on a boolean value.
   *
   * @param truthy Extension to apply when the parameter is true
   * @param falsy Extension to apply when the parameter is false
   * @return The extension
   */
  export function createConditionalExtension(
    truthy: Extension,
    falsy: Extension = []
  ): IConfigurableExtension<boolean> {
    return new ConfigurableExtension<boolean>(value =>
      value ? truthy : falsy
    );
  }

  /**
   * Creates an immutable extension.
   *
   * @param extension Immutable extension
   * @return The extension
   */
  export function createImmutableExtension(
    extension: Extension
  ): IConfigurableExtension<undefined> {
    return new ImmutableExtension(extension);
  }

  /**
   * Get the default editor extensions.
   *
   * @returns CodeMirror 6 extension factories
   */
  export function getDefaultExtensions(
    options: {
      themes?: IEditorThemeRegistry;
      translator?: ITranslator | null;
    } = {}
  ): ReadonlyArray<Readonly<IEditorExtensionFactory<any>>> {
    const { themes, translator } = options;
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    const extensions: IEditorExtensionFactory<any>[] = [
      Object.freeze({
        name: 'autoClosingBrackets',
        default: false,
        factory: () => createConditionalExtension(closeBrackets()),
        schema: {
          type: 'boolean',
          title: trans.__('Auto Closing Brackets')
        }
      }),
      Object.freeze({
        name: 'codeFolding',
        default: false,
        factory: () => createConditionalExtension(foldGutter()),
        schema: {
          type: 'boolean',
          title: trans.__('Code Folding')
        }
      }),
      Object.freeze({
        name: 'cursorBlinkRate',
        default: 1200,
        factory: () =>
          createConfigurableExtension((value: number) =>
            drawSelection({ cursorBlinkRate: value })
          ),
        schema: {
          type: 'number',
          title: trans.__('Cursor blinking rate'),
          description: trans.__(
            'Half-period in milliseconds used for cursor blinking. The default blink rate is 1200ms. By setting this to zero, blinking can be disabled.'
          )
        }
      }),
      Object.freeze({
        name: 'highlightActiveLine',
        default: false,
        factory: () => createConditionalExtension(highlightActiveLine()),
        schema: {
          type: 'boolean',
          title: trans.__('Highlight the active line')
        }
      }),
      Object.freeze({
        name: 'highlightSpecialCharacters',
        default: true,
        factory: () => createConditionalExtension(highlightSpecialChars()),
        schema: {
          type: 'boolean',
          title: trans.__('Highlight special characters')
        }
      }),
      Object.freeze({
        name: 'highlightTrailingWhitespace',
        default: false,
        factory: () =>
          createConditionalExtension(highlightTrailingWhitespace()),
        schema: {
          type: 'boolean',
          title: trans.__('Highlight trailing white spaces')
        }
      }),
      Object.freeze({
        name: 'highlightWhitespace',
        default: false,
        factory: () => createConditionalExtension(highlightWhitespace()),
        schema: {
          type: 'boolean',
          title: trans.__('Highlight white spaces')
        }
      }),
      Object.freeze({
        name: 'indentUnit',
        default: '4',
        factory: () =>
          createConfigurableExtension<string>((value: string) =>
            value == 'Tab'
              ? indentUnit.of('\t')
              : indentUnit.of(' '.repeat(parseInt(value, 10)))
          ),
        schema: {
          type: 'string',
          title: trans.__('Indentation unit'),
          description: trans.__(
            'The indentation is a `Tab` or the number of spaces. This defaults to 4 spaces.'
          ),
          enum: ['Tab', '1', '2', '4', '8']
        }
      }),
      // Default keyboard shortcuts
      // TODO at some point we may want to get this configurable
      Object.freeze({
        name: 'keymap',
        default: [
          {
            key: 'Mod-Enter',
            run: StateCommands.insertBlankLineOnRun
          },
          {
            key: 'Enter',
            run: StateCommands.completerOrInsertNewLine
          },
          {
            key: 'Escape',
            run: StateCommands.simplifySelectionAndMaybeSwitchToCommandMode
          },
          ...defaultKeymap.filter(binding => {
            // - Disable the default Mod-Enter handler as it always prevents default,
            //   preventing us from running cells with Ctrl + Enter. Instead we provide
            //   our own handler (insertBlankLineOnRun) which does not prevent default
            //   when used in code runner editors.
            // - Disable the default Shift-Mod-k handler because users prefer Ctrl+D
            //   for deleting lines, and because it prevents opening Table of Contents
            //   with Ctrl+Shift+K.
            // - Disable shortcuts for toggling comments ("Mod-/" and "Alt-A")
            //   as these as handled by lumino command
            // - Disable Escape handler because it prevents default and we
            //   want to run a cell action (switch to command mode) on Esc
            // - Disable default Enter handler because it prevents us from
            //   accepting a completer suggestion with Enter.
            // - Disable Ctrl-m (Shift-Alt-m on Mac) which toggles tab focus mode;
            //   JupyterLab binds `Esc` to an equivalent behavior (switching
            //   between command end edit mode) in notebooks, but has no equivalent
            //   in the File Editor; instead, a `codemirror:toggle-tab-focus-mode`
            //   command can be bound to invoke this behaviour.
            return ![
              'Ctrl-m',
              'Mod-Enter',
              'Shift-Mod-k',
              'Mod-/',
              'Alt-A',
              'Escape',
              'Enter'
            ].includes(binding.key as string);
          }),
          {
            key: 'Tab',
            run: StateCommands.indentMoreOrInsertTab,
            shift: StateCommands.dedentIfNotLaunchingTooltip
          }
        ],
        factory: () =>
          createConfigurableExtension<KeyBinding[]>(value => keymap.of(value))
      }),
      Object.freeze({
        name: 'lineNumbers',
        default: true,
        factory: () => createConditionalExtension(lineNumbers()),
        schema: {
          type: 'boolean',
          title: trans.__('Line Numbers')
        }
      }),
      Object.freeze({
        name: 'lineWrap',
        factory: () => createConditionalExtension(EditorView.lineWrapping),
        default: true,
        schema: {
          type: 'boolean',
          title: trans.__('Line Wrap')
        }
      }),
      Object.freeze({
        name: 'dropCursor',
        default: true,
        factory: () => createConditionalExtension(dropCursor()),
        schema: {
          type: 'boolean',
          title: trans.__('Drop Cursor')
        }
      }),
      Object.freeze({
        name: 'matchBrackets',
        default: true,
        factory: () =>
          createConditionalExtension([
            bracketMatching(),
            // closeBracketsKeymap must have higher precedence over defaultKeymap
            Prec.high(keymap.of(closeBracketsKeymap))
          ]),
        schema: {
          type: 'boolean',
          title: trans.__('Match Brackets')
        }
      }),
      Object.freeze({
        name: 'rectangularSelection',
        default: true,
        factory: () =>
          createConditionalExtension([
            rectangularSelection(),
            crosshairCursor()
          ]),
        schema: {
          type: 'boolean',
          title: trans.__('Rectangular selection'),
          description: trans.__(
            'Rectangular (block) selection can be created by dragging the mouse pointer while holding the left mouse button and the Alt key. When the Alt key is pressed, a crosshair cursor will appear, indicating that the rectangular selection mode is active.'
          )
        }
      }),
      Object.freeze({
        name: 'readOnly',
        default: false,
        factory: () =>
          createConfigurableExtension((value: boolean) => [
            EditorState.readOnly.of(value),
            value
              ? EditorView.editorAttributes.of({ class: READ_ONLY_CLASS })
              : []
          ])
      }),
      Object.freeze({
        name: 'rulers',
        default: [],
        factory: () =>
          createConfigurableExtension((value: number[]) =>
            value.length > 0 ? rulers(value) : []
          ),
        schema: {
          type: 'array',
          title: trans.__('Rulers'),
          items: {
            type: 'number',
            minimum: 0
          }
        }
      }),
      Object.freeze({
        name: 'extendSelection',
        default: true,
        factory: () =>
          createConditionalExtension(
            keymap.of([
              {
                key: 'Mod-Shift-l',
                run: selectSelectionMatches,
                preventDefault: true
              }
            ])
          )
      }),
      Object.freeze({
        // Whether to activate the native CodeMirror search panel or not.
        name: 'searchWithCM',
        default: false,
        factory: () =>
          createConditionalExtension(
            keymap.of([
              {
                key: 'Mod-f',
                run: openSearchPanel,
                scope: 'editor search-panel'
              },
              {
                key: 'F3',
                run: findNext,
                shift: findPrevious,
                scope: 'editor search-panel',
                preventDefault: true
              },
              {
                key: 'Mod-g',
                run: findNext,
                shift: findPrevious,
                scope: 'editor search-panel',
                preventDefault: true
              },
              {
                key: 'Escape',
                run: closeSearchPanel,
                scope: 'editor search-panel'
              }
            ])
          )
      }),
      Object.freeze({
        name: 'scrollPastEnd',
        default: false,
        factory: (options: IEditorExtensionFactory.IOptions) =>
          options.inline ? null : createConditionalExtension(scrollPastEnd())
      }),
      Object.freeze({
        name: 'smartIndent',
        default: true,
        factory: () => createConditionalExtension(indentOnInput()),
        schema: {
          type: 'boolean',
          title: trans.__('Smart Indentation')
        }
      }),
      /**
       * tabFocusable
       *
       * Can the user use the tab key to focus on / enter the CodeMirror editor?
       * If this is false, the CodeMirror editor can still be focused (via
       * mouse-click, for example), just not via tab key navigation.
       *
       * It can be useful to set tabFocusable to false when the editor is
       * embedded in a context that provides an alternative to the tab key for
       * navigation. For example, the Notebook widget allows the user to move
       * from one cell to another using the up and down arrow keys and to enter
       * and exit the CodeMirror editor associated with that cell by pressing
       * the enter and escape keys, respectively.
       */
      Object.freeze({
        name: 'tabFocusable',
        // The default for this needs to be true because the CodeMirror editor
        // is used in lots of different places. By default, a user should be
        // able to tab into a CodeMirror editor on the page, and by default, the
        // user should be able to get out of the editor by pressing the escape
        // key then immediately pressing the tab key (or shift+tab to go
        // backwards on the page). If there are places in the app where this
        // model of user interaction doesn't make sense or is broken, those
        // places should be remedied on a case-by-case basis, **not** by making
        // `tabFocusable` false by default.
        default: true,
        factory: () =>
          createConditionalExtension(
            EditorView.contentAttributes.of({
              tabIndex: '0'
            }),
            EditorView.contentAttributes.of({
              tabIndex: '-1'
            })
          )
      }),
      Object.freeze({
        name: 'tabSize',
        default: 4,
        factory: () =>
          createConfigurableExtension((value: number) =>
            EditorState.tabSize.of(value)
          ),
        schema: {
          type: 'number',
          title: trans.__('Tab size')
        }
      }),
      Object.freeze({
        name: 'tooltips',
        factory: () =>
          // we need `absolute` due to use of `contain: layout` in lumino;
          // we attach to body to ensure cursor collaboration tooltip is
          // visible in first line of the editor.
          createImmutableExtension(
            tooltips({
              position: 'absolute',
              parent: document.body
            })
          )
      }),
      Object.freeze({
        name: 'allowMultipleSelections',
        default: true,
        factory: () =>
          createConfigurableExtension((value: boolean) =>
            EditorState.allowMultipleSelections.of(value)
          ),
        schema: {
          type: 'boolean',
          title: trans.__('Multiple selections')
        }
      }),
      Object.freeze({
        name: 'customStyles',
        factory: () =>
          createConfigurableExtension<CustomTheme>(config =>
            customTheme(config)
          ),
        default: {
          fontFamily: null,
          fontSize: null,
          lineHeight: null
        },
        schema: {
          title: trans.__('Custom editor styles'),
          type: 'object',
          properties: {
            fontFamily: {
              type: ['string', 'null'],
              title: trans.__('Font Family')
            },
            fontSize: {
              type: ['number', 'null'],
              minimum: 1,
              maximum: 100,
              title: trans.__('Font Size')
            },
            lineHeight: {
              type: ['number', 'null'],
              title: trans.__('Line Height')
            }
          },
          additionalProperties: false
        }
      })
    ];

    if (themes) {
      extensions.push(
        Object.freeze({
          name: 'theme',
          default: 'jupyter',
          factory: () =>
            createConfigurableExtension<string>(value =>
              themes.getTheme(value)
            ),
          schema: {
            type: 'string',
            title: trans.__('Theme'),
            description: trans.__('CodeMirror theme')
          }
        })
      );
    }

    if (translator) {
      extensions.push(
        Object.freeze({
          name: 'translation',
          // The list of internal strings is available at https://codemirror.net/examples/translate/
          default: {
            // @codemirror/view
            'Control character': trans.__('Control character'),
            // @codemirror/commands
            'Selection deleted': trans.__('Selection deleted'),
            // @codemirror/language
            'Folded lines': trans.__('Folded lines'),
            'Unfolded lines': trans.__('Unfolded lines'),
            to: trans.__('to'),
            'folded code': trans.__('folded code'),
            unfold: trans.__('unfold'),
            'Fold line': trans.__('Fold line'),
            'Unfold line': trans.__('Unfold line'),
            // @codemirror/search
            'Go to line': trans.__('Go to line'),
            go: trans.__('go'),
            Find: trans.__('Find'),
            Replace: trans.__('Replace'),
            next: trans.__('next'),
            previous: trans.__('previous'),
            all: trans.__('all'),
            'match case': trans.__('match case'),
            replace: trans.__('replace'),
            'replace all': trans.__('replace all'),
            close: trans.__('close'),
            'current match': trans.__('current match'),
            'replaced $ matches': trans.__('replaced $ matches'),
            'replaced match on line $': trans.__('replaced match on line $'),
            'on line': trans.__('on line'),
            // @codemirror/autocomplete
            Completions: trans.__('Completions'),
            // @codemirror/lint
            Diagnostics: trans.__('Diagnostics'),
            'No diagnostics': trans.__('No diagnostics')
          },
          factory: () =>
            createConfigurableExtension<Record<string, string>>(value =>
              EditorState.phrases.of(value)
            )
        })
      );
    }

    return extensions;
  }
}
