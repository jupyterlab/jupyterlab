// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';

import { Base64ModelFactory } from '@jupyterlab/docregistry';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Token } from '@lumino/coreutils';

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
    super({ ...options, shell: options.shell || new LabShell() });
    this.restored = this.shell.restored
      .then(() => undefined)
      .catch(() => undefined);

    // Create an IInfo dictionary from the options to override the defaults.
    const info = Object.keys(JupyterLab.defaultInfo).reduce((acc, val) => {
      if (val in options) {
        (acc as any)[val] = JSON.parse(JSON.stringify((options as any)[val]));
      }
      return acc;
    }, {} as Partial<JupyterLab.IInfo>);

    // Populate application info.
    this._info = { ...JupyterLab.defaultInfo, ...info };

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
  private _paths: JupyterFrontEnd.IPaths;
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
      Partial<IInfo> {
    paths?: Partial<JupyterFrontEnd.IPaths>;
  }

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
     * Whether files are cached on the server.
     */
    readonly filesCached: boolean;
  }

  /**
   * The default JupyterLab application info.
   */
  export const defaultInfo: IInfo = {
    devMode: PageConfig.getOption('devMode').toLowerCase() === 'true',
    deferred: { patterns: [], matches: [] },
    disabled: { patterns: [], matches: [] },
    mimeExtensions: [],
    filesCached: PageConfig.getOption('cacheFiles').toLowerCase() === 'true'
  };

  /**
   * The default JupyterLab application paths.
   */
  export const defaultPaths: JupyterFrontEnd.IPaths = {
    urls: {
      base: PageConfig.getOption('baseUrl'),
      notFound: PageConfig.getOption('notFoundUrl'),
      app: PageConfig.getOption('appUrl'),
      static: PageConfig.getOption('staticUrl'),
      settings: PageConfig.getOption('settingsUrl'),
      themes: PageConfig.getOption('themesUrl'),
      tree: PageConfig.getOption('treeUrl'),
      workspaces: PageConfig.getOption('workspacesUrl'),
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
    default: JupyterFrontEndPlugin<any> | JupyterFrontEndPlugin<any>[];
  }
}
