// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISettingRegistry, PageConfig, URLExt
} from '@jupyterlab/coreutils';

import {
  each
} from '@phosphor/algorithm';

import {
  PromiseDelegate, Token
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
    let registry = options.settingRegistry;
    this._host = options.host;
    let id = 'jupyter.services.theme-manager';
    options.when.then(() => {
      this._sealed = true;
    });
    this.ready = Promise.all([registry.load(id), options.when]).then(([settings]) => {
      this._settings = settings;
      this._settings.changed.connect(this._onSettingsChanged, this);
      return this._handleSettings();
    });
  }

  /**
   * A promise that resolves when the theme manager is ready.
   */
  readonly ready: Promise<void>;

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
   * Set the current theme.
   */
  setTheme(name: string): Promise<void> {
    return this.ready.then(() => {
      this._settings.set('theme', name);
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
    if (this._sealed) {
      throw new Error('Cannot register themes after startup');
    }
    let name = theme.name;
    if (this._themes[name]) {
      throw new Error(`Theme already registered for ${name}`);
    }
    this._themes[name] = theme;
    return new DisposableDelegate(() => {
      delete this._themes[name];
    });
  }

  /**
   * Load a theme CSS file by path.
   *
   * @param path - The path of the file to load.
   */
  loadCSS(path: string): Promise<void> {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    let baseUrl = PageConfig.getOption('themePath');
    link.href = URLExt.join(baseUrl, path);
    let promise = new PromiseDelegate<void>();
    link.onload = () => {
      promise.resolve(void 0);
    };
    document.body.appendChild(link);
    this._links.push(link);
    return promise.promise;
  }

  /**
   * Handle a change to the settings.
   */
  private _onSettingsChanged(sender: ISettingRegistry.ISettings): void {
    this._pendingTheme = sender.composite['theme'] as string;
    if (!this._themes[this._pendingTheme]) {
      return;
    }
    if (this._pendingTheme === this._loadedTheme) {
      return;
    }
    if (this._loadPromise) {
      return;
    }
    this._loadTheme();
  }

  /**
   * Handle the current settings.
   */
  private _handleSettings(): Promise<void> {
    let settings = this._settings;
    let theme = settings.composite['theme'] as string;
    if (!this._themes[theme]) {
      let old = theme;
      theme = settings.default('theme') as string;
      if (!this._themes[theme]) {
        return Promise.reject('No default theme to load');
      }
      console.warn(`Could not find theme "${old}", loading default theme "${theme}"`);
    }
    this._pendingTheme = theme;
    return this._loadTheme();
  }

  /**
   * Load the theme.
   */
  private _loadTheme(): Promise<void> {
    let newTheme = this._themes[this._pendingTheme];
    let oldPromise = Promise.resolve(void 0);
    let oldTheme = this._themes[this._loadedTheme];
    if (oldTheme) {
      oldPromise = oldTheme.unload();
    }
    this._pendingTheme = '';
    this._loadPromise = oldPromise.then(() => {
      this._links.forEach(link => {
        if (link.parentElement) {
          link.parentElement.removeChild(link);
        }
      });
      this._links.length = 0;
      return newTheme.load();
    }).then(() => {
      this._loadedTheme = newTheme.name;
      this._finishLoad();
    }).catch(error => {
      console.error(error);
    });
    return this._loadPromise;
  }

  /**
   * Handle a load finished.
   */
  private _finishLoad(): void {
    Private.fitAll(this._host);
    this._loadPromise = null;

    if (this._pendingTheme) {
      this._loadTheme();
    }
  }

  private _baseUrl: string;
  private _themes: { [key: string]: ThemeManager.ITheme } = {};
  private _links: HTMLLinkElement[] = [];
  private _host: Widget;
  private _settings: ISettingRegistry.ISettings;
  private _pendingTheme = '';
  private _loadedTheme: string | null = null;
  private _loadPromise: Promise<void> | null = null;
  private _sealed = false;
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
    settingRegistry: ISettingRegistry;

    /**
     * The host widget for the theme manager.
     */
    host: Widget;

    /**
     * A promise for when all themes should have been registered.
     */
    when: Promise<void>;
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
