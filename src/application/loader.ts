// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  maxSatisfying, satisfies
} from 'semver';


/**
 * A module loader using semver for dynamic resolution of requires.
 *
 * It is meant to be used in conjunction with the JupyterLabPlugin
 * for WebPack from `@jupyterlab/extension-builder`.
 */
export
class ModuleLoader {
  /**
   * Construct a new module loader.
   */
  constructor() {
    // Provide the `require.ensure` function used for code
    // splitting in the WebPack bundles.
    // https://webpack.github.io/docs/code-splitting.html
    this._boundRequire = this.require.bind(this) as any;
    this._boundRequire.ensure = this.ensureBundle.bind(this);
  }

  /**
   * Define a module that can be synchronously required.
   *
   * @param path - The version-mangled fully qualified path of the module.
   *   For example, "foo@1.0.1/lib/bar/baz.js".
   *
   * @param callback - The callback function for invoking the module.
   *
   * #### Notes
   * This is a no-op if the path is already registered.
   */
  define(path: string, callback: ModuleLoader.DefineCallback): void {
    if (!(path in this._registered)) {
      this._registered[path] = callback;
    }
  }

  /**
   * Synchronously require a module that has already been loaded.
   *
   * @param path - The semver-mangled fully qualified path of the module.
   *   For example, "foo@^1.1.0/lib/bar/baz.js".
   *
   * @returns The exports of the requested module, if registered.  The module
   *   selected is the registered module that maximally satisfies the semver
   *   range of the request.
   *
   * #### Notes
   * Will throw an error if the required path cannot be satisfied.
   */
  require(path: string): any {
    // Check if module is in cache.
    let id = this._findMatch(path);
    if (!id) {
      throw new Error(`No matching module found for: "${path}"`);
    }
    let installed = this._modules;
    if (installed[id]) {
      return installed[id].exports;
    }

    // Create a new module (and put it into the cache).
    let mod: ModuleLoader.IModule = installed[id] = {
      exports: {},
      require: this._boundRequire,
      id,
      loaded: false
    };

    // Execute the module function.
    let callback = this._registered[id];
    callback.call(mod.exports, mod, mod.exports, this._boundRequire);

    // Flag the module as loaded.
    mod.loaded = true;

    // Return the exports of the module.
    return mod.exports;
  }

  /**
   * Ensure a bundle is loaded on the page.
   *
   * @param path - The public path of the bundle (e.g. "lab/jupyter.bundle.js").
   *
   * @param callback - The callback invoked when the bundle has loaded.
   *
   * @returns A promise that resolves when the bundle is loaded.
   */
  ensureBundle(path: string, callback?: ModuleLoader.EnsureCallback): Promise<void> {
    let bundle = this._getBundle(path);

    if (bundle.loaded) {
      if (callback) {
        callback.call(null, this._boundRequire);
      }
      return Promise.resolve(void 0);
    }

    if (callback) {
      bundle.callbacks.push(callback);
    }
    return bundle.promise;
  }

  /**
   * Extract the entry point plugins of an extension.
   *
   * @param data - The loaded entry point module.
   *
   * @returns An array of validated plugins.
   *
   * #### Notes
   * The plugin(s) are extracted and validated before being returned.
   */
  extractPlugins(data: any): IPlugin<Application<Widget>, any>[] {
    // We use the default export from es6 modules.
    if (data.__esModule) {
      data = data.default;
    }
    if (!Array.isArray(data)) {
      data = [data];
    }
    if (!data.length) {
      throw new Error(`No plugins found`);
    }
    for (let i = 0; i < data.length; i++) {
      let plugin = data[i];
      if (!plugin.hasOwnProperty('id')) {
        throw new Error(`Missing id for plugin ${i}`);
      }
      if (typeof(plugin['activate']) !== 'function') {
        let id: string = plugin.id;
        throw Error(`Missing activate function in '${id}'`);
      }
    }
    return data;
  }

  /**
   * Find a module path matching a given module request.
   *
   * @param path - The semver-mangled fully qualified path to the module.
   *   For example, "foo@^1.1.0/lib/bar/baz.js".
   *
   * @returns The matching defined module path, if registered.  A match is
   *   the registered path that maximally satisfies the semver range of the
   *   request.
   *
   * #### Notes
   * If the path has loaders, and thus multiple packages and modules delimited
   * by '!', then the versions are matched in reverse order.
   */
  private _findMatch(path: string): string {
    // Use the cached match if available.
    let cache = this._matches;
    if (cache[path]) {
      return cache[path];
    }
    let modules = Object.keys(this._registered);
    let sources = path.split('!').map(value => this._parsePath(value));
    if (sources.some(elem => !elem)) {
      // check to see if any element of sources is falsey
      throw Error('Invalid module path ' + path);
    }
    let matches: string[] = [];
    let versions: string[][] = [];
    for (let mod of modules) {
      let targets = mod.split('!').map(value => this._parsePath(value));
      if (targets.some(e => !e)) {
        continue;
      }
      if (sources.length === targets.length && sources.every((source, i) => {
        return (source.package === targets[i].package
          && source.module === targets[i].module
          && satisfies(targets[i].version, source.version));
      })) {
        matches.push(mod);
        versions.push(targets.map(t => t.version));
      }
    }

    if (!matches.length) {
      throw Error(`No module found matching: ${path}`);
    }

    // If we have a chain of loaders, we want
    // to filter for best versions in reverse order.
    for (let part = versions[0].length - 1; matches.length > 1 && part >= 0; part--) {
      let best = maxSatisfying(versions.map(v => v[part]), sources[part].version);
      if (!best) {
        throw new Error(`No module found satisfying ${path}`);
      }
      matches = matches.filter((mod, index) => versions[index][part] === best);
      versions = versions.filter(v => v[part] === best);
    }
    cache[path] = matches[0];
    return matches[0];
  }

  /**
   * Get or create a bundle record for a path.
   */
  private _getBundle(path: string): Private.IBundle {
    let bundle = this._bundles[path];
    if (bundle) {
      return bundle;
    }
    // Start bundle loading.
    let head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    let promise = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        while (bundle.callbacks.length) {
          bundle.callbacks.shift().call(null, this._boundRequire);
        }
        bundle.loaded = true;
        resolve(void 0);
      };
      script.onerror = err => {
        reject(err);
      };
    });
    head.appendChild(script);
    script.src = path;
    bundle = this._bundles[path] = {
      loaded: false,
      callbacks: [],
      promise
    };
    return bundle;
  }

  /**
   * Parse a version-mangled module path.
   *
   * @param path - The module path (e.g. "foo@^1.1.0/lib/bar/baz.js").
   *
   * @returns A parsed object describing the module path.
   */
  private _parsePath(path: string): Private.IPathInfo {
    let cache = this._parsed;
    if (cache[path]) {
      return cache[path];
    }
    let match = path.match(/(^(?:@[^/]+\/)??[^/@]+?)@([^/]+?)(\/.*)?$/);
    if (!match) {
      cache[path] = null;
    } else {
      cache[path] = {
        package: match[1],
        version: match[2],
        module: match[3]
      };
    }
    return cache[path];
  }

  private _registered: { [key: string]: ModuleLoader.DefineCallback } = Object.create(null);
  private _parsed: { [key: string]: Private.IPathInfo } = Object.create(null);
  private _modules: { [key: string]: ModuleLoader.IModule } = Object.create(null);
  private _bundles: { [key: string]: Private.IBundle } = Object.create(null);
  private _matches: { [key: string]: string } = Object.create(null);
  private _boundRequire: ModuleLoader.IRequire;
}


/**
 * A namespace for `ModuleLoader` statics.
 */
export
namespace ModuleLoader {
  /**
   * The interface for the require function.
   */
  export
  interface IRequire {
    (path: string): any;
    ensure(path: string, callback?: EnsureCallback): Promise<void>;
  }

  /**
   * The interface for a module.
   */
  export
  interface IModule {
    exports: any;
    require: IRequire;
    id: string;
    loaded: boolean;
  }

  /**
   * A callback for a define function that takes a module, its exports,
   * and a require function.
   */
  export
  type DefineCallback = (module: IModule, exports: any, require: IRequire) => void;

  /**
   * A callback for an ensure function that takes a require function.
   */
  export
  type EnsureCallback = (require: IRequire) => void;
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * A bundle record.
   */
  export
  interface IBundle {
    /**
     * Whether the bundle has been loaded.
     */
    loaded: boolean;

    /**
     * The callbacks associated with the bundle.
     */
    callbacks: ModuleLoader.EnsureCallback[];

    /**
     * A promise fullfiled when the bundle has loaded.
     */
    promise: Promise<void>;
  }

  /**
   * A parsed path record.
   */
  export
  interface IPathInfo {
    /**
     * The source package.
     */
    package: string;

    /**
     * The version string.
     */
    version: string;

    /**
     * The module path.
     */
    module: string;
  }
}
