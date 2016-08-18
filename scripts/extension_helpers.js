// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var findImports = require('find-imports');
var walkSync = require('walk-sync');


// Get the list of vendor files, with CodeMirror files being separate.
var VENDOR_FILES = findImports('../lib/**/*.js', { flatten: true });
var CODEMIRROR_FILES = VENDOR_FILES.filter(function(importPath) {
  return importPath.indexOf('codemirror') !== -1;
});
CODEMIRROR_FILES.push('codemirror/lib/codemirror.js');
VENDOR_FILES = VENDOR_FILES.filter(function (importPath) {
  return (importPath.indexOf('codemirror') !== 0 &&
          importPath.indexOf('phosphor') !== 0 &&
          importPath.indexOf('jupyter-js-services') !== 0);
});

// Get the list of codemirror imports.
var codemirrorPaths = CODEMIRROR_FILES.map(function(importPath) {
  return importPath.replace('.js', '');
});
codeMirrorPaths = codemirrorPaths.concat(['codemirror', '../lib/codemirror', '../../lib/codemirror']);


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
 * Parse a Webpack request to a module that has been shimmed.
 *
 * @params basePath (string) - The base import path with a trailing slash.
 *
 * @param outName (string) - The name of the output variable.
 *
 * @param request (string) - The Webpack request path.
 *
 * @returns An appropriate mangled Webpack import line or `undefined`.
 */
function parseShimmed(basePath, outName, request) {
  var regex = new RegExp("^" + basePath + '[\\w\.\\/-]+$');
  if (regex.test(request)) {
    try {
      var path = require.resolve(request);
    } catch (err) {
      return;
    }
    var index = path.indexOf(basePath);
    path = path.slice(index + basePath.length);
    return 'var ' + outName + '["' + path + '"]';
  }
}


/**
 * The base Webpack `externals` config.
 */
var BASE_EXTERNALS = [
  {
    'jquery': '$',
    'jquery-ui': '$'
  },
  function(context, request, callback) {
    // All phosphor imports get mangled to use the external bundle.
    lib = parseShimmed('phosphor/lib/', 'jupyter.phosphor', request);
    if (lib) {
      return callback(null, lib);
    }

    // CodeMirror imports just use the external bundle.
    if (codemirrorPaths.indexOf(request) !== -1) {
      return callback(null, 'var jupyter.CodeMirror');
    }

    callback();
  }
];


/**
 * The default Webpack `externals` config that should be applied to
 * extensions of JupyterLab.
 */
var DEFAULT_EXTERNALS = BASE_EXTERNALS.concat([
  {
    'jupyter-js-services': 'jupyter.services',
  },
  function(context, request, callback) {
    // JupyterLab imports get mangled to use the external bundle.
    var lib = parseShimmed('jupyterlab/lib/', 'jupyter.lib', request);
    if (lib) {
      return callback(null, lib);
    }
    callback();
  }
]);


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
  var lines = ['var ' + modName + ' = {};'];

  // Find the path to the module.
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  modPath = path.join(path.dirname(modPath), sourceFolder);

  // Walk through the source tree.
  var entries = walkSync.entries(modPath, {
    directories: false,
    globs: ['**/*.js', '**/*.css']
  });
  for (var i = 0; i < entries.length; i++) {
    // Get the relative path to the entry.
    var entryPath = entries[i].relativePath;
    // Add an entries for each file.
    lines.push(modName + '["' + entryPath + '"] = require("' + path.join(modName, sourceFolder, entryPath) + '");');
  }
  lines.push('module.exports = ' + modName + ';');

  return lines.join('\n');
}



// determine whether the package JSON contains a JupyterLab extension
function validateExtension(pkg){
  try {
    // for now, just try to load the key... could check whether file exists?
    pkg['jupyter']['lab']['main']
    return true;
  } catch(err) {
    return false;
  }
}

// the publicly exposed function
function upstreamExternals(_require) {
  // remember which packages we have seen
  var _seen = {},
    // load the user's package.json
    _user_pkg = _require('./package.json');


  // check for whether this is the root package
  function _is_user_pkg(pkg) {
    return _user_pkg['name'] === pkg['name'];
  }


  // use the provided scoped _require and the current nested location
  // in the `node_modules` hierarchy to resolve down to the list of externals
  function _load_externals(pkg_path, pkg) {
    var pkg_externals = [pkg['name']];

    try {
      pkg_externals = pkg_externals.concat(_require(
        pkg_path + '/' + pkg['jupyter']['lab']['externals']));
    } catch (err) {
      // not really worth adding any output here... usually, just the name will
      // suffice
    }
    return pkg_externals || [];
  }


  // return an array of strings, functions or regexen that can be deferenced by
  // webpack `externals` config directive
  // https://webpack.github.io/docs/configuration.html#externals
  function _find_externals(pkg_path) {
    var pkg = _require(pkg_path + '/package.json'),
      lab_config;

    // only visit each named package once
    _seen[pkg['name']] = true;

    if (!validateExtension(pkg)) {
      if (!_is_user_pkg(pkg)) {
        return [];
      } else {
        throw Error(
          pkg['name'] + ' does not contain a jupyter configuration. ' +
          ' Please see TODO: where?'
        );
      }
    }

    console.info("Inspecting", pkg['name'],
                 "for upstream JupyterLab extensions...");

    // ok, actually start building the externals. If it is the user package,
    // it SHOULDN'T be an external, as this is what the user will use for their
    // build... otherwise, load the externals, which is probably
    var externals = _is_user_pkg(pkg) ?
      DEFAULT_EXTERNALS :
      _load_externals(pkg_path, pkg, _require);

    // Recurse through the dependencies, and collect anything that has
    // a JupyterLab config
    return Object.keys(pkg['dependencies'])
      .filter(function(key){ return !_seen[key]; })
      .reduce(function(externals, dep_name){
        return externals.concat(
          _find_externals(pkg_path + '/node_modules/' + dep_name));
      }, externals);
  }

  return _find_externals(".");
}

module.exports = {
  upstreamExternals: upstreamExternals,
  validateExtension: validateExtension,
  createShim: createShim,
  parseShimmed: parseShimmed,
  BASE_EXTERNALS: BASE_EXTERNALS,
  DEFAULT_EXTERNALS: DEFAULT_EXTERNALS,
  CODEMIRROR_FILES: CODEMIRROR_FILES,
  VENDOR_FILES: VENDOR_FILES
};
