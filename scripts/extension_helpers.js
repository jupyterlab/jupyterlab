// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');

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

// The "always ignore" externals used by JupyterLab, Phosphor and friends
var DEFAULT_EXTERNALS = [
    function(context, request, callback){
      console.log('TODO: Phosphor external rewriter...');
    },
    'jupyter-js-services',
    /codemirror/
  ];


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
  validate_extension: validate_extension
};
