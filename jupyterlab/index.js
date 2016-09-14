// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('material-design-icons/iconfont/material-icons.css');

require('jupyterlab/lib/default-theme/index.css');


/**
 * Validate an entry point given by the user.
 */
function validateEntryPoint(entryPoint) {
  var data = jupyter.require(entryPoint);
  // We use the default export from es6 modules.
  if (data.__esModule) {
    data = data.default;
  }
  if (!Array.isArray(data)) {
    data = [data];
  }
  var plugins = [];
  for (var i = 0; i < data.length; i++) {
    var plugin = data[i];
    if (!plugin.hasOwnProperty('id') ||
        !typeof(plugin['activate']) == 'function') {
      console.warn('Invalid plugin found in: ', entryPoint);
      continue;
    }
    plugins.push(plugin);
  }
  return plugins;
}


jupyter.lab = new JupyterLab();
jupyter.validateEntryPoint = validateEntryPoint;
jupyter.version = require('jupyterlab/package.json').version;

module.exports = jupyter.lab;
