// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;
var validateEntry = require('jupyterlab-extension-builder/lib/validate').validateEntry;


// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('material-design-icons/iconfont/material-icons.css');

require('jupyterlab/lib/default-theme/index.css');


/**
 * Get an entry point given by the user after validating.
 */
function getEntryPoint(entryPoint) {
  var plugins = jupyter.require(entryPoint);
  if (!Array.isArray(plugins)) {
    plugins = [plugins];
  }
  try {
    validateEntry(plugins);
  } catch (err) {
    console.error(err);
    plugins = [];
  }
  return plugins;
}


jupyter.lab = new JupyterLab();
jupyter.getEntryPoint = getEntryPoint;
jupyter.version = require('jupyterlab/package.json').version;

module.exports = jupyter.lab;
