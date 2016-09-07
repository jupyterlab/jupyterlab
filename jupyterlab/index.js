// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('material-design-icons/iconfont/material-icons.css');

require('jupyterlab/lib/default-theme/index.css');


/**
 * Test whether a value is a function.
 */
function isFunction(obj) {
  // http://stackoverflow.com/a/6000016.
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

/**
 * Validate an entry point given by the user.
 */
function validateEntryPoint(entryPoint) {
  var data = jupyter.require(entryPoint);
  if (!Array.isArray(data)) {
    data = [data];
  }
  var plugins = [];
  for (let i = 0; i < data.length; i++) {
    var plugin = data[i];
    if (!plugin.hasOwnProperty('id') || !isFunction(plugin['activate'])) {
      console.warn('Invalid plugin found in: ', entryPoint);
      continue;
    }
    plugins.push(plugin);
  }
  return plugins;
}


jupyter.lab = new JupyterLab();
jupyter.validateEntryPoint = validateEntryPoint;

module.exports = jupyter.lab;
