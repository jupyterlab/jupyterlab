// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  SettingRegistry
} from '@jupyterlab/coreutils';

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Widget
} from '@phosphor/widgets';



/* tslint:disable */
/**
 * The theme manager token.
 */
export
const IThemeManager = new Token<IThemeManager>('jupyter.services.theme-manager');
/* tslint:enable */


/**
 * An interface for a theme manager.
 */
export
interface IThemeManager extends ThemeManager {}


/**
 * A class that provides theme management.
 */
export
class ThemeManager {
  /**
   * Construct a new theme manager.
   */
  constructor(options: ThemeManager.IOptions) {
    this._baseUrl = options.baseUrl;
    this._registry = options.settingRegistry;
    this._host = options.host;
  }

  /**
   * Get the name of the current theme.
   */
  get theme(): string {
    return this._theme;
  }

  /**
   * The names of the registered themes.
   */
  get themes(): ReadonlyArray<string> {
    return this._themes.map(theme => theme.name);
  }

  /**
   * Set the current theme.
   */
  setTheme(name: string): Promise<void> {
    console.log(this._registry);
    return Promise.resolve(void 0);
  }

  /**
   * Register a theme with the theme manager.
   *
   * @param theme - The theme to register.
   *
   * @returns A disposable that can be used to unregister the theme.
   */
  register(theme: ThemeManager.ITheme): IDisposable {
    this._themes.push(theme);
    if (theme.name === 'JupyterLab Light') {
      theme.load().then(paths => {
        paths.forEach(path => {
          this._loadFile(path);
        });
      });
    }

    return new DisposableDelegate(() => {
      ArrayExt.removeFirstOf(this._themes, theme);
    });
  }

  /**
   * Load a theme CSS file by path.
   *
   * @param path - The path of the file to load.
   */
  private _loadFile(path: string): Promise<void> {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = path;
    link.onload = () => {
        this._host.fit();
    };
    document.body.appendChild(link);
    this._links.push(link);
    return Promise.resolve(void 0);
  }

  private _baseUrl: string;
  private _registry: SettingRegistry;
  private _theme: string;
  private _themes: ThemeManager.ITheme[] = [];
  private _links: HTMLLinkElement[] = [];
  private _host: Widget;
}


/**
 * A namespace for `ThemeManager` statics.
 */
export
namespace ThemeManager {
  /**
   * The options used to create a theme manager.
   */
  export
  interface IOptions {
    /**
     * The base url for the theme manager.
     */
    baseUrl: string;

    /**
     * The settings registry.
     */
    settingRegistry: SettingRegistry;

    /**
     * The host widget for the theme manager.
     */
    host: Widget;
  }

  /**
   * An interface for a theme.
   */
  export
  interface ITheme {
    /**
     * The display name of the theme.
     */
    name: string;

    /**
     * Load the theme.
     *
     * @returns A promise that resolves with the paths of the CSS
     * files to load.
     */
    load(): Promise<ReadonlyArray<string>>;

    /**
     * Unload the theme.
     *
     * @returns A promise that resolves when the theme is unloaded.
     */
    unload(): Promise<void>;
  }
}
