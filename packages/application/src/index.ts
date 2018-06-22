// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  CommandLinker
} from '@jupyterlab/apputils';

import {
  Base64ModelFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  createRendermimePlugins
} from './mimerenderers';

import {
  ApplicationShell
} from './shell';
import { ISignal, Signal } from '@phosphor/signaling';

export { ILayoutRestorer, LayoutRestorer } from './layoutrestorer';
export { IMimeDocumentTracker } from './mimerenderers';
export { IRouter, Router } from './router';
export { ApplicationShell } from './shell';


/**
 * The type for all JupyterLab plugins.
 */
export
type JupyterLabPlugin<T> = IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = {}) {
    super({ shell: new ApplicationShell() });
    this._busySignal = new Signal(this);
    this._info = { ...JupyterLab.defaultInfo, ...options };
    if (this._info.devMode) {
      this.shell.addClass('jp-mod-devMode');
    }

    this.serviceManager = new ServiceManager();

    let linker = new CommandLinker({ commands: this.commands });
    this.commandLinker = linker;

    let registry = this.docRegistry = new DocumentRegistry();
    registry.addModelFactory(new Base64ModelFactory());

    if (options.mimeExtensions) {
      let plugins = createRendermimePlugins(options.mimeExtensions);
      plugins.forEach(plugin => { this.registerPlugin(plugin); });
    }
  }

  /**
   * The document registry instance used by the application.
   */
  readonly docRegistry: DocumentRegistry;

  /**
   * The command linker used by the application.
   */
  readonly commandLinker: CommandLinker;

  /**
   * The service manager used by the application.
   */
  readonly serviceManager: ServiceManager;

  /**
   * A list of all errors encountered when registering plugins.
   */
  readonly registerPluginErrors: Array<Error> = [];

  /**
   * Whether the application is dirty.
   */
  get isDirty(): boolean {
    return this._dirtyCount > 0;
  }

  /**
   * Whether the application is busy.
   */
  get isBusy(): boolean {
    return this._busyCount > 0;
  }

  /**
   * Returns a signal for when application changes it's busy status.
   */
  get busySignal(): ISignal<JupyterLab, boolean> {
    return this._busySignal;
  }


  /**
   * The information about the application.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
  }

  /**
   * Promise that resolves when state is first restored, returning layout description.
   *
   * #### Notes
   * This is just a reference to `shell.restored`.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this.shell.restored;
  }

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable {
    this._dirtyCount++;
    return new DisposableDelegate(() => {
      this._dirtyCount = Math.max(0, this._dirtyCount - 1);
    });
  }

  /**
   * Set the application state to busy.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setBusy(): IDisposable {
    const oldBusy = this.isBusy;
    this._busyCount++;
    if (this.isBusy !== oldBusy) {
      this._busySignal.emit(this.isBusy);
    }
    return new DisposableDelegate(() => {
      const oldBusy = this.isBusy;
      this._busyCount--;
      if (this.isBusy !== oldBusy) {
        this._busySignal.emit(this.isBusy);
      }
    });
  }

  /**
   * Register plugins from a plugin module.
   *
   * @param mod - The plugin module to register.
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
   */
  registerPluginModules(mods: JupyterLab.IPluginModule[]): void {
    mods.forEach(mod => { this.registerPluginModule(mod); });
  }

  private _info: JupyterLab.IInfo;
  private _dirtyCount = 0;
  private _busyCount = 0;
  private _busySignal: Signal<JupyterLab, boolean>;
}


/**
 * The namespace for `JupyterLab` class statics.
 */
export
namespace JupyterLab {
  /**
   * The options used to initialize a JupyterLab object.
   */
  export
  interface IOptions extends Partial<IInfo> {}

  /**
   * The information about a JupyterLab application.
   */
  export
  interface IInfo {
    /**
     * The name of the JupyterLab application.
     */
    readonly name: string;

    /**
     * The version of the JupyterLab application.
     */
    readonly version: string;

    /**
     * The namespace/prefix plugins may use to denote their origin.
     */
    readonly namespace: string;

    /**
     * Whether the application is in dev mode.
     */
    readonly devMode: boolean;

    /**
     * The collection of deferred extension patterns and matched extensions.
     */
    readonly deferred: { patterns: string[], matches: string[] };

    /**
     * The collection of disabled extension patterns and matched extensions.
     */
    readonly disabled: { patterns: string[], matches: string[] };

    /**
     * The mime renderer extensions.
     */
    readonly mimeExtensions: IRenderMime.IExtensionModule[];

    /**
     * The urls used by the application.
     */
    readonly urls: {
      readonly page: string,
      readonly public: string,
      readonly settings: string,
      readonly themes: string
    };

    /**
     * The local directories used by the application.
     */
    readonly directories: {
      readonly appSettings: string,
      readonly schemas: string,
      readonly static: string,
      readonly templates: string,
      readonly themes: string,
      readonly userSettings: string,
      readonly serverRoot: string
    };

    /**
     * Whether files are cached on the server.
     */
    readonly filesCached: boolean;
  }

  /**
   * The default application info.
   */
  export
  const defaultInfo: IInfo = {
    name: PageConfig.getOption('appName') || 'JupyterLab',
    namespace: PageConfig.getOption('appNamespace'),
    version: PageConfig.getOption('appVersion') || 'unknown',
    devMode: PageConfig.getOption('devMode').toLowerCase() === 'true',
    deferred: { patterns: [], matches: [] },
    disabled: { patterns: [], matches: [] },
    mimeExtensions: [],
    urls: {
      page: PageConfig.getOption('pageUrl'),
      public: PageConfig.getOption('publicUrl'),
      settings: PageConfig.getOption('settingsUrl'),
      themes: PageConfig.getOption('themesUrl')
    },
    directories: {
      appSettings: PageConfig.getOption('appSettingsDir'),
      schemas: PageConfig.getOption('schemasDir'),
      static: PageConfig.getOption('staticDir'),
      templates: PageConfig.getOption('templatesDir'),
      themes: PageConfig.getOption('themesDir'),
      userSettings: PageConfig.getOption('userSettingsDir'),
      serverRoot: PageConfig.getOption('serverRoot')
    },
    filesCached: PageConfig.getOption('cacheFiles').toLowerCase() === 'true'
  };

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export
  interface IPluginModule {
    /**
     * The default export.
     */
    default: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
  }
}
