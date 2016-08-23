// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var helpers = require('./extension_helpers');

/**
 * The externals provided to libraries
 * this package builds (like jupyter-js-widgets).
 */
var BASE_EXTERNALS = [
  {
    'jquery': '$',
    'jquery-ui': '$'
  },
  helpers.createShimHandler('phosphor'),
  function(context, request, callback) {
    // CodeMirror imports get mangled to use an external bundle.
    var codeMirrorPaths = [
      'codemirror/mode/meta',
      'codemirror', '../lib/codemirror',  '../../lib/codemirror',
      'codemirror/lib/codemirror.css'
    ];
    // if (codeMirrorPaths.indexOf(request) !== -1) {
    //   return callback(null, 'amd codemirror');
    // }
    callback();
  }
];


/**
 * The externals that this package provides.
 */
var EXTERNALS = BASE_EXTERNALS.concat([
  helpers.createShimHandler('jupyter-js-services')
]);

module.exports = {
  BASE_EXTERNALS: BASE_EXTERNALS,
  EXTERNALS: EXTERNALS
};
