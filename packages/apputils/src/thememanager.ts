// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISettingRegistry, URLExt
} from '@jupyterlab/coreutils';

import {
  each
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

import {
  Dialog, showDialog
} from './dialog';

import {
  ISplashScreen
} from './splash';


/* tslint:disable */
/**
 * The theme manager token.
 */
export
const IThemeManager = new Token<IThemeManager>('@jupyterlab/apputils:IThemeManager');
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
    const { key, url, splash } = options;
    const registry = options.settingRegistry;

    this._splash = splash;
    this._baseUrl = url;
    this._host = options.host;

    registry.load(key).then(settings => {
      this._settings = settings;
      this._settings.changed.connect(this._loadSettings, this);
      this._loadSettings();
    });
  }

  /**
   * Get the name of the current theme.
   */
  get theme(): string | null {
    return this._loadedTheme;
  }

  /**
   * The names of the registered themes.
   */
  get themes(): ReadonlyArray<string> {
    return Object.keys(this._themes);
  }

  /**
   * Load a theme CSS file by path.
   *
   * @param path - The path of the file to load.
   */
  loadCSS(path: string): Promise<void> {
    const base = this._baseUrl;
    const href = URLExt.isLocal(path) ? URLExt.join(base, path) : path;
    const links = this._links;

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');

      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', href);
      link.addEventListener('load', () => { resolve(undefined); });
      link.addEventListener('error', () => {
        reject(`Stylesheet failed to load: ${href}`);
      });

      document.body.appendChild(link);
      links.push(link);
    });
  }

  /**
   * Register a theme with the theme manager.
   *
   * @param theme - The theme to register.
   *
   * @returns A disposable that can be used to unregister the theme.
   */
  register(theme: ThemeManager.ITheme): IDisposable {
    const { name } = theme;
    const themes = this._themes;

    if (themes[name]) {
      throw new Error(`Theme already registered for ${name}`);
    }

    themes[name] = theme;

    return new DisposableDelegate(() => { delete themes[name]; });
  }

  /**
   * Set the current theme.
   */
  setTheme(name: string): Promise<void> {
    return this._settings.set('theme', name);
  }

  /**
   * Handle the current settings.
   */
  private _loadSettings(): Promise<void> {
    const settings = this._settings;
    const themes = this._themes;
    const theme = settings.composite['theme'] as string;

    // If the theme exists, load it right away.
    if (themes[theme]) {
      return this._loadTheme(theme);
    }

    // if (!themes[theme]) {
    //   const old = theme;

    //   theme = settings.default('theme') as string;
    //   if (!themes[theme]) {
    //     const error = new Error(`Default theme "${theme}" did not load.`);

    //     return Promise.reject(error).catch(this._onError);
    //   }
    //   console.warn(`Could not load theme "${old}", using default "${theme}".`);
    // }

    // this._pendingTheme = theme;

    // return this._loadTheme().catch(this._onError);
  }

  /**
   * Load the theme.
   *
   * #### Notes
   * This method assumes that the `theme` exists.
   */
  private _loadTheme(theme: string): Promise<void> {
    const links = this._links;
    const loadedTheme = this._loadedTheme;
    const themes = this._themes;
    const splash = this._splash.show();

    // Unload any CSS files that have been loaded.
    links.forEach(link => {
      if (link.parentElement) {
        link.parentElement.removeChild(link);
      }
    });
    links.length = 0;

    // Unload the previously loaded theme.
    const old = loadedTheme ? themes[loadedTheme].unload() : Promise.resolve();

    return Promise.all([old, themes[theme].load()]).then(() => {
      splash.dispose();
      this._loadedTheme = theme;
      Private.fitAll(this._host);
    }).catch(reason => {
      splash.dispose();
      this._onError(reason);
    });
  }

  /**
   * Handle a theme error.
   */
  private _onError(reason: any): void {
    showDialog({
      title: 'Error Loading Theme',
      body: String(reason),
      buttons: [Dialog.okButton({ label: 'OK' })]
    });
  }

  /**
   * Handle a change to the settings.
   */
  // private _onSettingsChanged(sender: ISettingRegistry.ISettings): void {
  //   this._pendingTheme = sender.composite['theme'] as string;
  //   if (!this._themes[this._pendingTheme]) {
  //     return;
  //   }
  //   if (this._pendingTheme === this._loadedTheme) {
  //     return;
  //   }
  //   if (this._loadPromise) {
  //     return;
  //   }
  //   this._loadTheme();
  // }

  private _baseUrl: string;
  private _themes: { [key: string]: ThemeManager.ITheme } = { };
  private _links: HTMLLinkElement[] = [];
  private _host: Widget;
  private _settings: ISettingRegistry.ISettings;
  // private _pendingTheme = '';
  private _loadedTheme: string | null = null;
  // private _loadPromise: Promise<void> | null = null;
  private _splash: ISplashScreen;
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
     * The setting registry key that holds theme setting data.
     */
    key: string;

    /**
     * The url for local theme loading.
     */
    url: string;

    /**
     * The settings registry.
     */
    settingRegistry: ISettingRegistry;

    /**
     * The host widget for the theme manager.
     */
    host: Widget;

    /**
     * The splash screen to show when loading themes.
     */
    splash: ISplashScreen;
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
     * @returns A promise that resolves when the theme has loaded.
     */
    load(): Promise<void>;

    /**
     * Unload the theme.
     *
     * @returns A promise that resolves when the theme has unloaded.
     */
    unload(): Promise<void>;
  }
}


/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * Fit a widget and all of its children, recursively.
   */
  export
  function fitAll(widget: Widget): void {
    each(widget.children(), fitAll);
    widget.fit();
  }
}
