// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import * as fs
  from 'fs';

import * as path
  from 'path';

import * as webpack
  from 'webpack';


/**
 * A WebPack plugin that generates custom bundles that use version and
 * semver-mangled require semantics.
 */
export
class JupyterLabPlugin {
  /**
   * Construct a new JupyterLabPlugin.
   */
  constructor(options?: JupyterLabPlugin.IOptions) {
    options = options || {};
    this._name = options.name || 'jupyter';
    let rootPath = this._rootPath = options.rootPath || path.resolve('.');
    try {
      this._getDependencies(rootPath);
      console.log('got dependencies');
    } catch (e) {
      throw new Error('Root path must contain a package.json');
    }
  }

  /**
   * Plugin installation, called by WebPack.
   *
   * @param compiler - The WebPack compiler object.
   */
  apply(compiler: webpack.compiler.Compiler) {
    let publicPath = compiler.options.output.publicPath;
    if (!publicPath) {
      throw new Error('Must define a public path');
    }
    if (publicPath[publicPath.length - 1] !== '/') {
      publicPath += '/';
    }
    this._publicPath = publicPath;

    // Notes
    // We use the emit phase because it allows other plugins to act on the
    // output first.
    // We can't replace the module ids during compilation, because there are
    // places in the compilation that assume a numeric id.
    compiler.plugin('emit', this._onEmit.bind(this));
  }

  /**
   * Get the dependencies on a given path.
   */
  private _getDependencies(basePath: string): void {
    const data = require(path.join(basePath, 'package.json'));
    const name = data.name + '@' + data.version;
    console.log(name);
    if (name in this._packages) {
        return;
    }
    this._packages[name] = {
      name: data.name, version: data.version,
      dependencies: data.dependencies, jupyterlab: data.jupyterlab
    };
    for (let name in data.dependencies) {
      this._getDependency(basePath, name);
    }
  }

  /**
   * Get a given dependency.
   */
  private _getDependency(basePath: string, name: string): void {
    // Walk up the tree to the root path looking for the package.
    while (true) {
      let fullPath = path.join(basePath, 'node_modules', name);
      if (fs.existsSync(fullPath)) {
        return this._getDependencies(fs.realpathSync(fullPath));
      }

      // Use require.resolve if we get to the root path.
      if (basePath === this._rootPath) {
        basePath = require.resolve(name);
         // Walk up the tree looking for the package.json.
        while (true) {
          console.log(basePath);
          let fullPath = path.join(basePath, 'package.json');
          if (fs.existsSync(fullPath)) {
            return this._getDependencies(fs.realpathSync(basePath));
          }
          basePath = path.resolve(basePath, '..');
        }
      } else {
        basePath = path.resolve(basePath, '..');
      }
    }
  }

  /**
   * Handle the emit stage of the compilation.
   */
  private _onEmit(compilation: any, callback: () => void): void {

    // Explore each chunk (build output):
    compilation.chunks.forEach((chunk: any) => {

      let sources: string[] = [];

      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach((mod: any) => {

        // We don't allow externals.
        if (mod.external) {
          throw Error(`Cannot use externals: ${mod.userRequest}`);
        }

        // Parse each module.
        let source = this._parseModule(compilation, mod);
        sources.push(source);
      });

      let code = sources.join('\n\n');

      // Replace the original chunk file.
      // Use the first file name, because the mangling of the chunk
      // file names are private to WebPack.
      let fileName = chunk.files[0];
      compilation.assets[fileName] = {
        source: function() {
          return code;
        },
        size: function() {
          return code.length;
        }
      };

      // Create a manifest for the chunk.
      let manifest: any = {};
      if (chunk.entryModule) {
        manifest['entry'] = Private.getDefinePath(chunk.entryModule);
      }
      manifest['hash'] = chunk.hash;
      manifest['id'] = chunk.id;
      manifest['name'] = chunk.name || chunk.id;
      manifest['files'] = chunk.files;
      manifest['packages'] = this._packages;

      let manifestSource = JSON.stringify(manifest, null, '\t');

      compilation.assets[`${fileName}.manifest`] = {
        source: () => {
          return manifestSource;
        },
        size: () => {
          return manifestSource.length;
        }
      };

    });

    callback();

  }

  /**
   * Parse a WebPack module to generate a custom version.
   *
   * @param compilation - The Webpack compilation object.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns The new module contents.
   */
  private _parseModule(compilation: any, mod: any): string {
    let pluginName = this._name;
    let publicPath = this._publicPath;
    let requireName = `__${pluginName}_require__`;
    // There is no public API in WebPack to get the raw module source
    // The method used below is known to work in almost all cases
    // The base prototype of the module source() method takes no arguments,
    // but the normal module source() takes three arguments and is intended
    // to be called by its module factory.
    // We can call the normal module source() because it has already been
    // run in the compilation process and will return the cached value,
    // without relying on the provided arguments.
    // https://github.com/webpack/webpack/blob/a53799c0ac58983860a27648cdc8519b6a562b89/lib/NormalModule.js#L224-L229
    let source = mod.source().source();

    // Regular modules.
    if (mod.userRequest) {
      // Handle ensure blocks with and without inline comments.
      // From WebPack dependencies/DepBlockHelpers
      source = this._handleEnsure(
        compilation, source, /__webpack_require__.e\/\*.*?\*\/\((\d+)/
      );
      source = this._handleEnsure(
        compilation, source, /__webpack_require__.e\((\d+)/
      );

      // Replace the require statements with the semver-mangled name.
      let deps = Private.getAllModuleDependencies(mod);
      for (let i = 0; i < deps.length; i++) {
        let dep = deps[i];
        let target = `__webpack_require__(${dep.id})`;
        let modPath = Private.getRequirePath(mod, dep);
        let replacer = `__webpack_require__('${modPath}')`;
        source = source.split(target).join(replacer);
      }
    // Context modules.
    } else if (mod.context) {
      // Context modules have to be assembled ourselves
      // because they are not clearly delimited in the text.
      source = Private.createContextModule(mod);
      source = source.split('webpackContext').join(`${pluginName}Context`);
    }

    // Handle public requires.
    let requireP = '__webpack_require__.p +';
    let newRequireP = `'${publicPath}' +`;
    source = source.split(requireP).join(newRequireP);

    // Replace the require name with the custom one.
    source = source.split('__webpack_require__').join(requireName);

    // Handle ES6 exports
    source = source.split('__webpack_exports__').join('exports');

    // Create our header and footer with a version-mangled defined name.
    let definePath = Private.getDefinePath(mod);
    let header = `/** START DEFINE BLOCK for ${definePath} **/
${pluginName}.define('${definePath}', function (module, exports, ${requireName}) {
\t`;
    let footer = `
})
/** END DEFINE BLOCK for ${definePath} **/
`;

    // Combine code and indent.
    return header + source.split('\n').join('\n\t') + footer;
  }

  /**
   * Handle an ensure block.
   *
   * @param compilation - The Webpack compilation object.
   *
   * @param source - The raw module source.
   *
   * @param publicPath - The public path of the plugin.
   *
   * @param regex - The ensure block regex.
   *
   * @returns The new ensure block contents.
   */
  private _handleEnsure(compilation: any, source: string, regex: RegExp) {
    let publicPath = this._publicPath;
    while (regex.test(source)) {
      let match = source.match(regex);
      let chunkId = match[1];
      let fileName = '';
      // Use the first file name, because the mangling of the chunk
      // file name is private to WebPack.
      compilation.chunks.forEach((chunk: any) => {
        if (String(chunk.id) === chunkId) {
          fileName = chunk.files[0];
        }
      });
      let replacement = `__webpack_require__.e('${publicPath}${fileName}'`;
      source = source.replace(regex, replacement);
    }
    return source;
  }

  private _name = '';
  private _publicPath = '';
  private _packages: JSONObject = Object.create(null);
  private _rootPath = '';
}


/**
 * A namespace for `JupyterLabPlugin` statics.
 */
export
namespace JupyterLabPlugin {
  export
  interface IOptions {
    /**
     * The name of the plugin.
     */
    name?: string;

    /**
     * The root path of the plugin, containing the package.json.
     */
    rootPath?: string;
  }
}


/**
 * A namespace for module private data.
 */
namespace Private {

  /**
   * Get the define path for a WebPack module.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns A version-mangled define path for the module.
   *    For example, 'foo@1.0.1/lib/bar/baz.js'.
   */
  export
  function getDefinePath(mod: any): string {
    if (!mod.context) {
      return '__ignored__';
    }
    let request = mod.userRequest || mod.context;
    let parts = request.split('!');
    let names: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      names.push(getModuleVersionPath(parts[i]));
    }
    return names.join('!');
  }

  /**
   * Get the require path for a WebPack module.
   *
   * @param mod - A parsed WebPack module that is requiring a dependency.
   * @param dep - A parsed WebPack module object representing the dependency.
   *
   * @returns A semver-mangled define path for the dependency.
   *    For example, 'foo@^1.0.0/lib/bar/baz.js'.
   */
  export
  function getRequirePath(mod: any, dep: any): string {
    if (!dep.context) {
      return '__ignored__';
    }
    let issuer = mod.userRequest || mod.context;
    let request = dep.userRequest || dep.context;
    let requestParts = request.split('!');
    let parts: string[] = [];

    // Handle the loaders.
    for (let i = 0; i < requestParts.length - 1; i++) {
      parts.push(getModuleSemverPath(requestParts[i], requestParts[i]));
    }
    // Handle the last part.
    let base = requestParts[requestParts.length - 1];
    parts.push(getModuleSemverPath(base, issuer));
    return parts.join('!');
  }

  /**
   * Create custom context module source.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns The new contents of the context module output.
   */
  export
  function createContextModule(mod: any): string {
    // Modeled after Webpack's ContextModule.js.
    let map: { [key: string]: string } = {};
    let dependencies = mod.dependencies || [];
    dependencies.slice().sort((a: any, b: any) => {
      if (a.userRequest === b.userRequest) {
        return 0;
      }
      return a.userRequest < b.userRequest ? -1 : 1;
    }).forEach((dep: any) => {
      if (dep.module) {
        map[dep.userRequest] = getRequirePath(mod, dep.module);
      }
    });
    let mapString = JSON.stringify(map, null, '\t');
    return generateContextModule(mapString, getDefinePath(mod));
  }

  /**
   * Get all of the module dependencies for a module.
   */
  export
  function getAllModuleDependencies(mod: any): any[] {
    // Extracted from https://github.com/webpack/webpack/blob/ee1b8c43b474b22a20bfc25daf0ee153dfb2ef9f/lib/NormalModule.js#L227
    let list: any[] = [];

    function doDep(dep: any) {
      if (dep.module && list.indexOf(dep.module) < 0) {
        list.push(dep.module);
      }
    }

    function doVariable(variable: any) {
      variable.dependencies.forEach(doDep);
    }

    function doBlock(block: any) {
      block.variables.forEach(doVariable);
      block.dependencies.forEach(doDep);
      block.blocks.forEach(doBlock);
    }

    doBlock(mod);
    return list;
  }

  /**
   * Find a package root path from a request.
   *
   * @param request - The request path.
   *
   * @returns The path to the package root.
   */
  function findRoot(request: string): string {
    let orig = request;
    if (path.extname(request)) {
      request = path.dirname(request);
    }
    while (true) {
      try {
        let pkgPath = require.resolve(path.join(request, 'package.json'));
        let pkg = require(pkgPath);
        // Use public packages except for the local package.
        if (!pkg.private || request === (process as any).cwd()) {
          return request;
        }
      } catch (err) {
        // no-op
      }
      let prev = request;
      request = path.dirname(request);
      if (request === prev) {
        throw Error(`Could not find package for ${orig}`);
      }
    }
  }

  /**
   * Get the package.json associated with a file.
   *
   * @param request - The request path.
   *
   * @returns The package.json object for the package.
   */
  function getPackage(request: string): any {
    let rootPath = findRoot(request);
    return require(path.join(rootPath, 'package.json'));
  }

  /**
   * Get a mangled path for a path using the exact version.
   *
   * @param modPath - The absolute path of the module.
   *
   * @returns A version-mangled path (e.g. 'foo@1.0.0/lib/bar/baz.js')
   */
  function getModuleVersionPath(modPath: string): string {
    let rootPath = findRoot(modPath);
    let pkg = getPackage(rootPath);
    modPath = modPath.slice(rootPath.length + 1);
    let name = `${pkg.name}@${pkg.version}`;
    if (modPath) {
      modPath = modPath.split(path.sep).join('/');
      name += `/${modPath}`;
    }
    return name;
  }

  /**
   * Get the semver-mangled path for a request.
   *
   * @param request - The requested module path.
   *
   * @param issuer - The path of the issuer of the module request.
   *
   * @returns A semver-mangled path (e.g. 'foo@^1.0.0/lib/bar/baz.js')
   *
   * #### Notes
   * Files in the same package are locked to the exact version number
   * of the package. Files in local packages (i.e., `file://` packages) are
   * allowed to vary by patch number (the `~` semver range specifier is added).
   */
  function getModuleSemverPath(request: string, issuer: string): string {
    let rootPath = findRoot(request);
    let rootPackage = getPackage(rootPath);
    let issuerPackage = getPackage(issuer);
    let modPath = request.slice(rootPath.length + 1);
    let name = rootPackage.name;
    let semver = ((issuerPackage.dependencies &&
                   issuerPackage.dependencies[name]) || rootPackage.version);
    if (issuerPackage.name === rootPackage.name) {
      semver = `${rootPackage.version}`;
    } else if (semver.indexOf('file:') === 0) {
      let sourcePath = path.resolve(rootPath, semver.slice('file:'.length));
      let sourcePackage = getPackage(sourcePath);
      // Allow patch version increments of local packages.
      semver = `~${sourcePackage.version}`;
    }

    let id = `${name}@${semver}`;
    if (modPath) {
      modPath = modPath.split(path.sep).join('/');
      id += `/${modPath}`;
    }
    return id;
  }

  /**
   * Generate a context module given a mapping and an id.
   */
  function generateContextModule(mapString: string, id: string) {
    return `
      var map = ${mapString};
      function webpackContext(req) {
        return __webpack_require__(webpackContextResolve(req));
      };
      function webpackContextResolve(req) {
        return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
      };
      webpackContext.keys = function webpackContextKeys() {
        return Object.keys(map);
      };
      webpackContext.resolve = webpackContextResolve;
      module.exports = webpackContext;
      webpackContext.id = "${id}";
    `;
  }
}
