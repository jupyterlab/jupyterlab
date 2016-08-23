// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var walkSync = require('walk-sync');

/**
  Helper scripts to be used by extension authors (and extension extenders) in a
  webpack.config.json to create builds that do not include upstream extensions.

  Inspects the package.json of the user's package and those of its dependencies
  to find extensions that should be excluded.

  Slightly more than minimal valid setup in package.json:

    {
      "name": "foo-widget",
      "jupyter": {
        "lab": {
          "main": "lab-extension.js"
        }
      },
      "dependencies": {
        "jupyterlab": "*",
        "jupyter-js-widgets": "*"
      }
    }

  Example usage in webpack.config.js:

    var jlab_helpers = require('jupyterlab/scripts/extension_helpers');

    module.exports = [{
      entry: './src/lab/extension.js',
      output: {
        filename: 'lab-extension.js',
        path: '../pythonpkg/static',
        libraryTarget: 'this'
      },
      externals: jlab_helpers.upstreamExternals(require)
    }];
*/

/**
 * Determine if a string starts with another.
 *
 * @param str (string) - the string possibly starting with the substring.
 *
 * @param query (string) - the substring whose presence we are testing.
 *
 * @returns true if str starts with query
 *
 * #### Notes
 * This is a cross-browser version of String.prototype.startsWith
 */
function startsWith(str, query) {
  return str.lastIndexOf(query, 0) === 0;
}

/**
 * Create a Webpack `externals` function for a shimmed external package.
 *
 * @param pkgName (string) - The name of the package
 *
 * @returns A function to be used as part of a WebPack config.
 */
function createShimHandler(pkgName) {
  return function(context, request, callback) {
    // TODO: better path regex, probably only looking for .js or .css
    // since that is all we save
    if (startsWith(request, pkgName)) {
      try {
        var path = require.resolve(request);
      } catch (err) {
        return callback(err);
      }
      var index = path.indexOf(request);
      path = path.slice(index + pkgName.length);
      if (path.indexOf('/') === 0) {
        path = path.slice(1);
      }
      var shim = 'var jupyter.externals["' + pkgName + '"]["' + path + '"]';
      return callback(null, shim);
    }
    callback();
  }
}


/**
 * Create a shim to export all of a library's modules to a namespaced object.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder (defaults to `lib`).
 *
 * @returns The code used to export the entire package.
 */
function createShim(modName, sourceFolder) {
  var dirs = [];
  var files = [];
  var lines = ['var shim = {};'];

  // Find the path to the module.
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  modPath = path.posix.join(path.dirname(modPath), sourceFolder);

  // Walk through the source tree.
  var entries = walkSync.entries(modPath, {
    directories: false,
    globs: ['**/*.js', '**/*.css']
  });
  for (var i = 0; i < entries.length; i++) {
    // Get the relative path to the entry.
    var entryPath = path.posix.join(sourceFolder, entries[i].relativePath);
    // Add an entries for each file.
    lines.push('shim["' + entryPath + '"] = require("' + path.posix.join(modName, entryPath) + '");');
  }
  lines.push('module.exports = shim;');

  return lines.join('\n');
}


/**
 * Determine whether a package is a JupyterLab extension.
 *
 * @param pkg (string) - The package.json object.
 *
 * @returns true if the package is a JupyterLab extension.
 */
function isLabExtension(pkg){
  try {
    // for now, just try to load the key... could check whether file exists?
    pkg['jupyter']['lab']['main']
    return true;
  } catch(err) {
    return false;
  }
}

/**
 * Recurse through dependencies, collecting all external functions.
 *
 * @param function - the environment require function.
 *
 * @param onlyUpstream - if true, do not return externals provided by this package
 *
 * @returns an externals object to be used in a Webpack config.
 *
 * #### Notes
 * A sample Webpack config will look like
 *
    var jlab_helpers = require('jupyterlab/scripts/extension_helpers');

    module.exports = [{
      entry: './src/lab/extension.js',
      output: {
        filename: 'lab-extension.js',
        path: '../pythonpkg/static',
        libraryTarget: 'this'
      },
      externals: jlab_helpers.upstreamExternals(require)
    }];
 */
function upstreamExternals(_require, onlyUpstream) {
  // Parse the externals of this package.

  // remember which packages we have seen
  var _seen = {};

  /**
   * Load the externals from a JupyterLab extension package.
   *
   * @param pkg_path (string) - the path on the filesystem to the package.
   *
   * @param pkg (object) - the package.json object.
   *
   * @returns an array containing the externals this package provides, excluding itself.
   *
   * #### Notes
   * This returns an array containing the externals referred to in the
   * package.json jupyter.lab.externals object:
   *
   * {module: "module-exporting-externals"}
   *
   * or
   *
   * {module: "module-exporting-externals", name: "exported-object"}
   */
  function _load_externals(pkg_path, pkg) {
    var externals = pkg.jupyter.lab.externals;
    if (externals) {
      try {
        var externalModule = _require(pkg_path + '/' + externals['module']);
        if (externals['name']) {
          pkgExternals = externalModule[externals['name']];
        } else {
          pkgExternals = externalModule;
        }
      } catch (err) {
        console.error('Error importing externals for ' + pkg.name);
      }
    }
    pkgExternals = pkgExternals || [];
    if (!Array.isArray(pkgExternals)) {
      pkgExternals = [pkgExternals];
    }

    return pkgExternals;
  }


  // return an array of strings, functions or regexen that can be deferenced by
  // webpack `externals` config directive
  // https://webpack.github.io/docs/configuration.html#externals
  function _find_externals(pkg_path, root) {
    var pkg = _require(pkg_path + '/package.json');
    var pkgName = pkg['name'];
    var lab_config;
    var externals = [];

    // only visit each named package once
    _seen[pkgName] = true;

    if (!isLabExtension(pkg)) {
      return [];
    }

    console.info("Inspecting " + pkgName + " for externals it provides...");

    if (!(root && onlyUpstream)) {
      externals.push.apply(externals, _load_externals(pkg_path, pkg, _require));
    }
    if (!root) {
      externals.push(createShimHandler(pkg['name']));
    }

    // Recurse through the dependencies, and collect externals
    // for JupyterLab extensions
    return Object.keys(pkg['dependencies'])
      .filter(function(depName){ return !_seen[depName]; })
      .reduce(function(externals, depName){
        return externals.concat(
          // We assume the node_modules is flat
          // TODO: actually change directory before doing _find_externals?
          _find_externals(depName));
      }, externals);
  }

  var externals = _find_externals(".", true);
  return externals;
}

module.exports = {
  upstreamExternals: upstreamExternals,
  isLabExtension: isLabExtension,
  createShim: createShim,
  createShimHandler: createShimHandler,
};
