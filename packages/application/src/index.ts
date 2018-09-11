// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { CommandLinker } from '@jupyterlab/apputils';

import { Base64ModelFactory, DocumentRegistry } from '@jupyterlab/docregistry';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { ServiceManager } from '@jupyterlab/services';

import { Application, IPlugin } from '@phosphor/application';

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

import { createRendermimePlugins } from './mimerenderers';

import { ApplicationShell } from './shell';
import { ISignal, Signal } from '@phosphor/signaling';

export { ILayoutRestorer, LayoutRestorer } from './layoutrestorer';
export { IMimeDocumentTracker } from './mimerenderers';
export { IRouter, Router } from './router';
export { ApplicationShell } from './shell';

/**
 * The type for all JupyterLab plugins.
 */
export type JupyterLabPlugin<T> = IPlugin<JupyterLab, T>;

/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export class JupyterLab extends Application<ApplicationShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = {}) {
    super({ shell: new ApplicationShell() });
    this._busySignal = new Signal(this);
    this._dirtySignal = new Signal(this);

    // Construct the default workspace name.
    const defaultWorkspace = URLExt.join(
      PageConfig.getOption('baseUrl'),
      PageConfig.getOption('pageUrl')
    );

    // Set default workspace in page config.
    PageConfig.setOption('defaultWorkspace', defaultWorkspace);

    // Instantiate public resources.
    this.serviceManager = options.serviceManager || new ServiceManager();
    this.commandLinker =
      options.commandLinker || new CommandLinker({ commands: this.commands });
    this.docRegistry = options.docRegistry || new DocumentRegistry();

    // Remove extra resources (non-IInfo) from options object.
    delete options.serviceManager;
    delete options.commandLinker;
    delete options.docRegistry;

    // Populate application info.
    this._info = {
      ...JupyterLab.defaultInfo,
      ...(options as Partial<JupyterLab.IInfo>),
      ...{ defaultWorkspace }
    };

    if (this._info.devMode) {
      this.shell.addClass('jp-mod-devMode');
    }

    // Make workspace accessible via a getter because it is set at runtime.
    Object.defineProperty(this._info, 'workspace', {
      get: () => PageConfig.getOption('workspace') || ''
    });

    // Add initial model factory.
    this.docRegistry.addModelFactory(new Base64ModelFactory());

    if (options.mimeExtensions) {
      for (let plugin of createRendermimePlugins(options.mimeExtensions)) {
        this.registerPlugin(plugin);
      }
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
   * A method invoked on a document `'contextmenu'` event.
   *
   * #### Notes
   * The default implementation of this method opens the application
   * `contextMenu` at the current mouse position.
   *
   * If the application context menu has no matching content *or* if
   * the shift key is pressed, the default browser context menu will
   * be opened instead.
   *
   * A subclass may reimplement this method as needed.
   */
  protected evtContextMenu(event: MouseEvent): void {
    if (event.shiftKey) {
      return;
    }

    this._contextMenuEvent = event;
    if (this.contextMenu.open(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Gets the hierarchy of html nodes that was under the cursor
   * when the most recent contextmenu event was issued
   */
  get contextMenuNodes(): HTMLElement[] {
    if (!this._contextMenuEvent) {
      return [];
    }

    // this one-liner doesn't work, but should at some point
    // in the future (https://developer.mozilla.org/en-US/docs/Web/API/Event)
    // return this._contextMenuEvent.composedPath() as HTMLElement[];

    let nodes: HTMLElement[] = [this._contextMenuEvent.target as HTMLElement];
    while (
      'parentNode' in nodes[nodes.length - 1] &&
      nodes[nodes.length - 1].parentNode &&
      nodes[nodes.length - 1] !== nodes[nodes.length - 1].parentNode
    ) {
      nodes.push(nodes[nodes.length - 1].parentNode as HTMLElement);
    }
    return nodes;
  }

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
   * Promise that resolves when state is first restored, returning layout description.
   *
   * #### Notes
   * This is just a reference to `shell.restored`.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this.shell.restored;
  }

  /**
   * Gets all of the valid, non-empty values of a given property
   * across all of the nodes in the hierarchy returned by contextMenuNodes
   */
  contextMenuValues(prop: string): any[] {
    let vals: any[] = [];
    for (let node of this.contextMenuNodes as any[]) {
      if (prop in node && node[prop]) {
        vals.push(node[prop]);
      }
    }
    return vals;
  }

  /**
   * Gets the first valid, non-empty value of a property
   * in the node hierarchy returned by contextMenuNodes.
   * Optionally, gets the first value that matches a passed-in RegExp
   */
  contextMenuFirst(prop: string, regexp: RegExp | null = null): any | null {
    if (regexp) {
      for (let node of this.contextMenuNodes as any[]) {
        if (prop in node && node[prop]) {
          let match = node[prop].match(regexp);
          if (match) {
            return match;
          }
        }
      }
    } else {
      for (let node of this.contextMenuNodes as any[]) {
        if (prop in node && node[prop]) {
          return node[prop];
        }
      }
    }

    return;
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

  private _contextMenuEvent: MouseEvent;
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
  export interface IOptions extends Partial<IInfo> {
    /**
     * The document registry instance used by the application.
     */
    docRegistry?: DocumentRegistry;

    /**
     * The command linker used by the application.
     */
    commandLinker?: CommandLinker;

    /**
     * The service manager used by the application.
     */
    serviceManager?: ServiceManager;
  }

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
    default: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
  }
}
