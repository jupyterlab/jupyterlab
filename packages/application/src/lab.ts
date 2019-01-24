// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { Base64ModelFactory } from '@jupyterlab/docregistry';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Token } from '@phosphor/coreutils';

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { JupyterFrontEnd, JupyterFrontEndPlugin } from './frontend';

import { createRendermimePlugins } from './mimerenderers';

import { ILabShell, LabShell } from './shell';

/* tslint:disable */
/**
 * The application status token.
 */
export const ILabStatus = new Token<ILabStatus>(
  '@jupyterlab/application:ILabStatus'
);
/* tslint:enable */

/**
 * An interface for JupyterLab-like application status functionality.
 */
export interface ILabStatus {
  /**
   * A signal for when application changes its busy status.
   */
  readonly busySignal: ISignal<JupyterFrontEnd, boolean>;

  /**
   * A signal for when application changes its dirty status.
   */
  readonly dirtySignal: ISignal<JupyterFrontEnd, boolean>;

  /**
   * Whether the application is busy.
   */
  readonly isBusy: boolean;

  /**
   * Whether the application is dirty.
   */
  readonly isDirty: boolean;

  /**
   * Set the application state to busy.
   *
   * @returns A disposable used to clear the busy state for the caller.
   */
  setBusy(): IDisposable;

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable;
}

/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export class JupyterLab extends JupyterFrontEnd<ILabShell>
  implements ILabStatus {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = { shell: new LabShell() }) {
    super({ shell: options.shell || new LabShell() });
    this.restored = this.shell.restored
      .then(() => undefined)
      .catch(() => undefined);
    this._busySignal = new Signal(this);
    this._dirtySignal = new Signal(this);

    // Construct the default workspace name.
    const defaultWorkspace = URLExt.join(
      PageConfig.getOption('baseUrl'),
      PageConfig.getOption('pageUrl')
    );

    // Set default workspace in page config.
    PageConfig.setOption('defaultWorkspace', defaultWorkspace);

    // Create an IInfo dictionary from the options to override the defaults.
    const info = Object.keys(JupyterLab.defaultInfo).reduce(
      (acc, val) => {
        if (val in options) {
          (acc as any)[val] = JSON.parse(JSON.stringify((options as any)[val]));
        }
        return acc;
      },
      {} as Partial<JupyterLab.IInfo>
    );

    // Populate application info.
    this._info = {
      ...JupyterLab.defaultInfo,
      ...info,
      ...{ defaultWorkspace }
    };

    // Make workspace accessible via a getter because it is set at runtime.
    Object.defineProperty(this._info, 'workspace', {
      get: () => PageConfig.getOption('workspace') || ''
    });

    if (this._info.devMode) {
      this.shell.addClass('jp-mod-devMode');
    }

    // Add initial model factory.
    this.docRegistry.addModelFactory(new Base64ModelFactory());

    if (options.mimeExtensions) {
      for (let plugin of createRendermimePlugins(options.mimeExtensions)) {
        this.registerPlugin(plugin);
      }
    }
  }

  /**
   * A list of all errors encountered when registering plugins.
   */
  readonly registerPluginErrors: Array<Error> = [];

  /**
   * Promise that resolves when state is first restored, returning layout
   * description.
   */
  readonly restored: Promise<void>;

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
   * Returns a signal for when application changes its busy status.
   */
  get busySignal(): ISignal<JupyterLab, boolean> {
    return this._busySignal;
  }

  /**
   * Returns a signal for when application changes its dirty status.
   */
  get dirtySignal(): ISignal<JupyterLab, boolean> {
    return this._dirtySignal;
  }

  /**
   * The information about the application.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
  }

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable {
    const oldDirty = this.isDirty;
    this._dirtyCount++;
    if (this.isDirty !== oldDirty) {
      this._dirtySignal.emit(this.isDirty);
    }
    return new DisposableDelegate(() => {
      const oldDirty = this.isDirty;
      this._dirtyCount = Math.max(0, this._dirtyCount - 1);
      if (this.isDirty !== oldDirty) {
        this._dirtySignal.emit(this.isDirty);
      }
    });
  }

  /**
   * Set the application state to busy.
   *
   * @returns A disposable used to clear the busy state for the caller.
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
    mods.forEach(mod => {
      this.registerPluginModule(mod);
    });
  }

  private _info: JupyterLab.IInfo;
  private _dirtyCount = 0;
  private _busyCount = 0;
  private _busySignal: Signal<JupyterLab, boolean>;
  private _dirtySignal: Signal<JupyterLab, boolean>;
}

/**
 * The namespace for `JupyterLab` class statics.
 */
export namespace JupyterLab {
  /**
   * The options used to initialize a JupyterLab object.
   */
  export interface IOptions
    extends JupyterFrontEnd.IOptions<LabShell>,
      Partial<IInfo> {}

  /* tslint:disable */
  /**
   * The layout restorer token.
   */
  export const IInfo = new Token<IInfo>('@jupyterlab/application:IInfo');
  /* tslint:enable */

  /**
   * The information about a JupyterLab application.
   */
  export interface IInfo {
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
     * The urls used by the application.
     */
    readonly urls: {
      readonly base: string;
      readonly page: string;
      readonly public: string;
      readonly settings: string;
      readonly themes: string;
      readonly tree: string;
      readonly workspaces: string;
    };

    /**
     * The local directories used by the application.
     */
    readonly directories: {
      readonly appSettings: string;
      readonly schemas: string;
      readonly static: string;
      readonly templates: string;
      readonly themes: string;
      readonly userSettings: string;
      readonly serverRoot: string;
      readonly workspaces: string;
    };

    /**
     * Whether files are cached on the server.
     */
    readonly filesCached: boolean;

    /**
     * The name of the current workspace.
     */
    readonly workspace: string;

    /**
     * The name of the default workspace.
     */
    readonly defaultWorkspace: string;
  }

  /**
   * The default application info.
   */
  export const defaultInfo: IInfo = {
    name: PageConfig.getOption('appName') || 'JupyterLab',
    namespace: PageConfig.getOption('appNamespace'),
    version: PageConfig.getOption('appVersion') || 'unknown',
    devMode: PageConfig.getOption('devMode').toLowerCase() === 'true',
    deferred: { patterns: [], matches: [] },
    disabled: { patterns: [], matches: [] },
    mimeExtensions: [],
    urls: {
      base: PageConfig.getOption('baseUrl'),
      page: PageConfig.getOption('pageUrl'),
      public: PageConfig.getOption('publicUrl'),
      settings: PageConfig.getOption('settingsUrl'),
      themes: PageConfig.getOption('themesUrl'),
      tree: PageConfig.getOption('treeUrl'),
      workspaces: PageConfig.getOption('workspacesUrl')
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
    },
    filesCached: PageConfig.getOption('cacheFiles').toLowerCase() === 'true',
    workspace: '',
    defaultWorkspace: ''
  };

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export interface IPluginModule {
    /**
     * The default export.
     */
    default: JupyterFrontEndPlugin<any> | JupyterFrontEndPlugin<any>[];
  }
}
