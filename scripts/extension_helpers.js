// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var findImports = require('find-imports');

// Get the list of vendor files.
var jlabPath = path.dirname(require.resolve('jupyterlab/package.json'));
var VENDOR_FILES = findImports(jlabPath + '/lib/**/*.js', { flatten: true });
VENDOR_FILES = VENDOR_FILES.filter(function (importPath) {
  return (importPath.indexOf('codemirror') !== 0 &&
          importPath.indexOf('phosphor') !== 0 &&
          importPath.indexOf('jupyter-js-services') !== 0);
});

// Get the list of codemirror files.
var CODEMIRROR_FILES = VENDOR_FILES.filter(function(importPath) {
  return importPath.indexOf('codemirror') !== -1;
});
var codemirrorPaths = CODEMIRROR_FILES.map(function(importPath) {
  return importPath.replace('.js', '');
});
codeMirrorPaths = codemirrorPaths.concat(['codemirror', '../lib/codemirror', '../../lib/codemirror']);


/*
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
      externals: jlab_helpers.upstream_externals(require)
    }];
*/


/**
 * A function that mangles phosphor imports for a Webpack `externals` config.
 */
function phosphorExternals(context, request, callback) {
    // All phosphor imports get mangled to use the external bundle.
    var regex = /^phosphor\/lib\/[\w\/]+$/;
    if(regex.test(request)) {
        var path = require.resolve(request).replace('.js', '');
        var index = path.indexOf('phosphor/lib');
        path = path.slice(index + 'phosphor/lib/'.length);
        var lib = 'var jupyter.phosphor.' + path.split('/').join('.');
        return callback(null, lib);
    }
    callback();
}

/**
 * The base Webpack `externals` config for JupyterLab itself.
 */
var BASE_EXTERNALS = [
  phosphorExternals,
  function(context, request, callback) {
    // CodeMirror imports just use the external bundle.
    if (codemirrorPaths.indexOf(request) !== -1) {
      return callback(null, 'var jupyter.CodeMirror');
    }
    callback();
  },
  {
    'jupyter-js-services': 'jupyter.services',
    'jquery': '$',
    'jquery-ui': '$'
  }
];


/**
 * The default Webpack `externals` config that should be applied to
 * extensions of JupyterLab.
 */
var DEFAULT_EXTERNALS = BASE_EXTERNALS + [
  function(context, request, callback) {
    // JupyterLab imports get mangled to use the external bundle.
    var regex = /^jupyterlab\/lib\/([\w\.\/]+)$/;
    if(regex.test(request)) {
      var path = require.resolve(request).replace('.js', '');
      var index = path.indexOf('jupyterlab/lib');
      path = path.slice(index + 'jupyterlab/lib/'.length);
      var lib = 'var jupyter.lab.' + path.split('/').join('.');
      return callback(null, lib);
    }
    callback();
  }
]


// determine whether the package JSON contains a JupyterLab extension
function validate_extension(pkg){
  try {
    // for now, just try to load the key... could check whether file exists?
    pkg['jupyter']['lab']['main']
    return true;
  } catch(err) {
    return false;
  }
}

// the publicly exposed function
function upstream_externals(_require) {
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

    if (!validate_extension(pkg)) {
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
  upstream_externals: upstream_externals,
  validate_extension: validate_extension,
  phosphorExternals: phosphorExternals,
  BASE_EXTERNALS: BASE_EXTERNALS,
  CODEMIRROR_FILES: CODEMIRROR_FILES,
  VENDOR_FILES: VENDOR_FILES
};
