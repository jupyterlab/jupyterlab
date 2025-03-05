// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { Base64ModelFactory } from '@jupyterlab/docregistry';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  ConnectionStatus,
  IConnectionStatus,
  ServiceManager
} from '@jupyterlab/services';
import { PromiseDelegate, Token } from '@lumino/coreutils';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from './frontend';
import { createRendermimePlugins } from './mimerenderers';
import { ILabShell, LabShell } from './shell';
import { LabStatus } from './status';

/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export class JupyterLab extends JupyterFrontEnd<ILabShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = { shell: new LabShell() }) {
    super({
      ...options,
      shell: options.shell || new LabShell(),
      serviceManager:
        options.serviceManager ||
        new ServiceManager({
          standby: () => {
            return !this._info.isConnected || 'when-hidden';
          }
        })
    });

    // Populate application info.
    this._info = new JupyterLab.Info(options);

    this.restored = this.shell.restored
      .then(async () => {
        const activated: Promise<void | void[]>[] = [];
        const deferred = this.activateDeferredPlugins().catch(error => {
          console.error('Error when activating deferred plugins\n:', error);
        });
        activated.push(deferred);
        if (this._info.deferred) {
          const customizedDeferred = Promise.all(
            this._info.deferred.matches.map(pluginID =>
              this.activatePlugin(pluginID)
            )
          ).catch(error => {
            console.error(
              'Error when activating customized list of deferred plugins:\n',
              error
            );
          });
          activated.push(customizedDeferred);
        }
        Promise.all(activated)
          .then(() => {
            this._allPluginsActivated.resolve();
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    // Populate application paths override the defaults if necessary.
    const defaultURLs = JupyterLab.defaultPaths.urls;
    const defaultDirs = JupyterLab.defaultPaths.directories;
    const optionURLs = (options.paths && options.paths.urls) || {};
    const optionDirs = (options.paths && options.paths.directories) || {};

    this._paths = {
      urls: Object.keys(defaultURLs).reduce((acc, key) => {
        if (key in optionURLs) {
          const value = (optionURLs as any)[key];
          (acc as any)[key] = value;
        } else {
          (acc as any)[key] = (defaultURLs as any)[key];
        }
        return acc;
      }, {}),
      directories: Object.keys(JupyterLab.defaultPaths.directories).reduce(
        (acc, key) => {
          if (key in optionDirs) {
            const value = (optionDirs as any)[key];
            (acc as any)[key] = value;
          } else {
            (acc as any)[key] = (defaultDirs as any)[key];
          }
          return acc;
        },
        {}
      )
    } as JupyterFrontEnd.IPaths;

    if (this._info.devMode) {
      this.shell.addClass('jp-mod-devMode');
    }

    // Add initial model factory.
    this.docRegistry.addModelFactory(new Base64ModelFactory());

    if (options.mimeExtensions) {
      for (const plugin of createRendermimePlugins(options.mimeExtensions)) {
        this.registerPlugin(plugin);
      }
    }
  }

  /**
   * The name of the JupyterLab application.
   */
  readonly name = PageConfig.getOption('appName') || 'JupyterLab';

  /**
   * A namespace/prefix plugins may use to denote their provenance.
   */
  readonly namespace = PageConfig.getOption('appNamespace') || this.name;

  /**
   * A list of all errors encountered when registering plugins.
   *
   * @deprecated This is unused and may be removed in a future version.
   */
  readonly registerPluginErrors: Array<Error> = [];

  /**
   * Promise that resolves when state is first restored, returning layout
   * description.
   */
  readonly restored: Promise<void>;

  /**
   * The application busy and dirty status signals and flags.
   */
  readonly status = new LabStatus(this);

  /**
   * The version of the JupyterLab application.
   */
  readonly version = PageConfig.getOption('appVersion') || 'unknown';

  /**
   * The JupyterLab application information dictionary.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
  }

  /**
   * The JupyterLab application paths dictionary.
   */
  get paths(): JupyterFrontEnd.IPaths {
    return this._paths;
  }

  /**
   * Promise that resolves when all the plugins are activated, including the deferred.
   */
  get allPluginsActivated(): Promise<void> {
    return this._allPluginsActivated.promise;
  }
  /**
   * Register plugins from a plugin module.
   *
   * @param mod - The plugin module to register.
   *
   * @deprecated This is unused and may be removed in a future version.
   */
  registerPluginModule(mod: JupyterLab.IPluginModule): void {
    let data = mod.default;
    // Handle commonjs exports.
    if (!mod.hasOwnProperty('__esModule')) {
      data = mod as any;
    }
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach(item => {
      try {
        this.registerPlugin(item);
      } catch (error) {
        this.registerPluginErrors.push(error);
      }
    });
  }

  /**
   * Register the plugins from multiple plugin modules.
   *
   * @param mods - The plugin modules to register.
   *
   * @deprecated This is unused and may be removed in a future version.
   */
  registerPluginModules(mods: JupyterLab.IPluginModule[]): void {
    mods.forEach(mod => {
      this.registerPluginModule(mod);
    });
  }

  /**
   * Override keydown handling to prevent command shortcuts from preventing user input.
   *
   * This introduces a slight delay to the command invocation, but no delay to user input.
   */
  protected evtKeydown(keyDownEvent: KeyboardEvent): void {
    const permissionToExecute = new PromiseDelegate<boolean>();

    // Hold the execution of any keybinding until we know if this event would cause text insertion
    this.commands.holdKeyBindingExecution(
      keyDownEvent,
      permissionToExecute.promise
    );

    // Process the key immediately to invoke the prevent default handlers as needed
    this.commands.processKeydownEvent(keyDownEvent);

    // If we do not know the target, we cannot check if input would be inserted
    // as there is no target to attach the `beforeinput` event listener; in that
    // case we just permit execution immediately (this may happen for programmatic
    // uses of keydown)
    const target = keyDownEvent.target;
    if (!target) {
      return permissionToExecute.resolve(true);
    }

    let onBeforeInput: ((event: InputEvent) => void) | null = null;
    let onBeforeKeyUp: ((event: KeyboardEvent) => void) | null = null;

    const disconnectListeners = () => {
      if (onBeforeInput) {
        target.removeEventListener('beforeinput', onBeforeInput);
      }
      if (onBeforeKeyUp) {
        target.removeEventListener('keyup', onBeforeKeyUp);
      }
    };

    // Permit the execution conditionally, depending on whether the event would lead to text insertion
    const causesInputPromise = Promise.race([
      new Promise(resolve => {
        onBeforeInput = (inputEvent: InputEvent) => {
          switch (inputEvent.inputType) {
            case 'historyUndo':
            case 'historyRedo': {
              if (
                inputEvent.target instanceof Element &&
                inputEvent.target.closest('[data-jp-undoer]')
              ) {
                // Allow to use custom undo/redo bindings on `jpUndoer`s
                inputEvent.preventDefault();
                disconnectListeners();
                return resolve(false);
              }
              break;
            }
            case 'insertLineBreak': {
              if (
                inputEvent.target instanceof Element &&
                inputEvent.target.closest('.jp-Cell')
              ) {
                // Allow to override the default action of Shift + Enter on cells as this is used for cell execution
                inputEvent.preventDefault();
                disconnectListeners();
                return resolve(false);
              }
              break;
            }
          }
          disconnectListeners();
          return resolve(true);
        };
        target.addEventListener('beforeinput', onBeforeInput, { once: true });
      }),
      new Promise(resolve => {
        onBeforeKeyUp = (keyUpEvent: KeyboardEvent) => {
          if (keyUpEvent.code === keyDownEvent.code) {
            disconnectListeners();
            return resolve(false);
          }
        };
        target.addEventListener('keyup', onBeforeKeyUp, { once: true });
      }),
      new Promise(resolve => {
        setTimeout(() => {
          disconnectListeners();
          return resolve(false);
        }, Private.INPUT_GUARD_TIMEOUT);
      })
    ]);
    causesInputPromise
      .then(willCauseInput => {
        permissionToExecute.resolve(!willCauseInput);
      })
      .catch(console.warn);
  }

  private _info: JupyterLab.IInfo;
  private _paths: JupyterFrontEnd.IPaths;
  private _allPluginsActivated = new PromiseDelegate<void>();
}

/**
 * The namespace for `JupyterLab` class statics.
 */
export namespace JupyterLab {
  /**
   * The options used to initialize a JupyterLab object.
   */
  export interface IOptions
    extends Partial<JupyterFrontEnd.IOptions<ILabShell>>,
      Partial<IInfo> {
    /**
     * URL and directory paths used by a Jupyter front-end.
     */
    paths?: Partial<JupyterFrontEnd.IPaths>;

    /**
     * Application connection status.
     */
    connectionStatus?: IConnectionStatus;
  }

  /**
   * The application info token.
   */
  export const IInfo = new Token<IInfo>(
    '@jupyterlab/application:IInfo',
    'A service providing metadata about the current application, including disabled extensions and whether dev mode is enabled.'
  );

  /**
   * The information about a JupyterLab application.
   */
  export interface IInfo {
    /**
     * Whether the application is in dev mode.
     */
    readonly devMode: boolean;

    /**
     * The collection of deferred extension patterns and matched extensions.
     */
    readonly deferred: { patterns: string[]; matches: string[] };

    /**
     * The collection of disabled extension patterns and matched extensions.
     */
    readonly disabled: { patterns: string[]; matches: string[] };

    /**
     * The mime renderer extensions.
     */
    readonly mimeExtensions: IRenderMime.IExtensionModule[];

    /**
     * The information about available plugins.
     */
    readonly availablePlugins: IPluginInfo[];

    /**
     * Whether files are cached on the server.
     */
    readonly filesCached: boolean;

    /**
     * Every periodic network polling should be paused while this is set
     * to `false`. Extensions should use this value to decide whether to proceed
     * with the polling.
     * The extensions may also set this value to `false` if there is no need to
     * fetch anything from the server backend basing on some conditions
     * (e.g. when an error message dialog is displayed).
     * At the same time, the extensions are responsible for setting this value
     * back to `true`.
     */
    isConnected: boolean;
  }

  /**
   * The information about a JupyterLab application.
   */
  export class Info implements IInfo {
    constructor({
      connectionStatus,
      ...options
    }: Partial<IInfo> & { connectionStatus?: IConnectionStatus } = {}) {
      this._connectionStatus = connectionStatus ?? new ConnectionStatus();

      this._availablePlugins =
        options.availablePlugins ?? JupyterLab.defaultInfo.availablePlugins;
      this._devMode = options.devMode ?? JupyterLab.defaultInfo.devMode;
      this._deferred = JSON.parse(
        JSON.stringify(options.deferred ?? JupyterLab.defaultInfo.deferred)
      );
      this._disabled = JSON.parse(
        JSON.stringify(options.disabled ?? JupyterLab.defaultInfo.disabled)
      );
      this._filesCached =
        options.filesCached ?? JupyterLab.defaultInfo.filesCached;
      this._mimeExtensions = JSON.parse(
        JSON.stringify(
          options.mimeExtensions ?? JupyterLab.defaultInfo.mimeExtensions
        )
      );
      this.isConnected =
        options.isConnected ?? JupyterLab.defaultInfo.isConnected;
    }

    /**
     * The information about available plugins.
     */
    get availablePlugins(): IPluginInfo[] {
      return this._availablePlugins;
    }

    /**
     * Whether the application is in dev mode.
     */
    get devMode(): boolean {
      return this._devMode;
    }

    /**
     * The collection of deferred extension patterns and matched extensions.
     */
    get deferred(): { patterns: string[]; matches: string[] } {
      return this._deferred;
    }

    /**
     * The collection of disabled extension patterns and matched extensions.
     */
    get disabled(): { patterns: string[]; matches: string[] } {
      return this._disabled;
    }

    /**
     * Whether files are cached on the server.
     */
    get filesCached(): boolean {
      return this._filesCached;
    }

    /**
     * Every periodic network polling should be paused while this is set
     * to `false`. Extensions should use this value to decide whether to proceed
     * with the polling.
     * The extensions may also set this value to `false` if there is no need to
     * fetch anything from the server backend basing on some conditions
     * (e.g. when an error message dialog is displayed).
     * At the same time, the extensions are responsible for setting this value
     * back to `true`.
     */
    get isConnected(): boolean {
      return this._connectionStatus.isConnected;
    }
    set isConnected(v: boolean) {
      this._connectionStatus.isConnected = v;
    }

    /**
     * The mime renderer extensions.
     */
    get mimeExtensions(): IRenderMime.IExtensionModule[] {
      return this._mimeExtensions;
    }

    private _devMode: boolean;
    private _deferred: { patterns: string[]; matches: string[] };
    private _disabled: { patterns: string[]; matches: string[] };
    private _mimeExtensions: IRenderMime.IExtensionModule[];
    private _availablePlugins: IPluginInfo[];
    private _filesCached: boolean;
    private _connectionStatus: IConnectionStatus;
  }

  /*
   * A read-only subset of the `Token`.
   */
  export interface IToken
    extends Readonly<Pick<Token<any>, 'name' | 'description'>> {
    // no-op
  }

  /**
   * A readonly subset of lumino plugin bundle (excluding activation function,
   * service, and state information, and runtime token details).
   */
  interface ILuminoPluginData
    extends Readonly<
      Pick<JupyterFrontEndPlugin<void>, 'id' | 'description' | 'autoStart'>
    > {
    /**
     * The types of required services for the plugin, or `[]`.
     */
    readonly requires: IToken[];

    /**
     * The types of optional services for the the plugin, or `[]`.
     */
    readonly optional: IToken[];

    /**
     * The type of service provided by the plugin, or `null`.
     */
    readonly provides: IToken | null;
  }

  /**
   * A subset of plugin bundle enriched with JupyterLab extension metadata.
   */
  export interface IPluginInfo extends ILuminoPluginData {
    /**
     * The name of the extension which provides the plugin.
     */
    extension: string;
    /**
     * Whether the plugin is enabled.
     */
    enabled: boolean;
  }

  /**
   * The default JupyterLab application info.
   */
  export const defaultInfo: IInfo = {
    devMode: PageConfig.getOption('devMode').toLowerCase() === 'true',
    deferred: { patterns: [], matches: [] },
    disabled: { patterns: [], matches: [] },
    mimeExtensions: [],
    availablePlugins: [],
    filesCached: PageConfig.getOption('cacheFiles').toLowerCase() === 'true',
    isConnected: true
  };

  /**
   * The default JupyterLab application paths.
   */
  export const defaultPaths: JupyterFrontEnd.IPaths = {
    urls: {
      base: PageConfig.getOption('baseUrl'),
      notFound: PageConfig.getOption('notFoundUrl'),
      app: PageConfig.getOption('appUrl'),
      doc: PageConfig.getOption('docUrl'),
      static: PageConfig.getOption('staticUrl'),
      settings: PageConfig.getOption('settingsUrl'),
      themes: PageConfig.getOption('themesUrl'),
      translations: PageConfig.getOption('translationsApiUrl'),
      hubHost: PageConfig.getOption('hubHost') || undefined,
      hubPrefix: PageConfig.getOption('hubPrefix') || undefined,
      hubUser: PageConfig.getOption('hubUser') || undefined,
      hubServerName: PageConfig.getOption('hubServerName') || undefined
    },
    directories: {
      appSettings: PageConfig.getOption('appSettingsDir'),
      schemas: PageConfig.getOption('schemasDir'),
      static: PageConfig.getOption('staticDir'),
      templates: PageConfig.getOption('templatesDir'),
      themes: PageConfig.getOption('themesDir'),
      userSettings: PageConfig.getOption('userSettingsDir'),
      serverRoot: PageConfig.getOption('serverRoot'),
      workspaces: PageConfig.getOption('workspacesDir')
    }
  };

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export interface IPluginModule {
    /**
     * The default export.
     */
    default:
      | JupyterFrontEndPlugin<any, any, any>
      | JupyterFrontEndPlugin<any, any, any>[];
  }
}

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * The delay for invoking a command introduced by user input guard.
   * Decreasing this value may lead to commands incorrectly triggering
   * on user input. Increasing this value will lead to longer delay for
   * command invocation. Note that user input is never delayed.
   *
   * The value represents the number in milliseconds.
   */
  export const INPUT_GUARD_TIMEOUT = 10;
}
