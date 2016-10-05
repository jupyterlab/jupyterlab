// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('../lib/application').JupyterLab;
var extractPlugins = require('jupyterlab-extension-builder/lib/extract').extractPlugins;


// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('../lib/default-theme/index.css');


/**
 * Get an entry point given by the user after validating.
 */
function getEntryPoint(entryPoint) {
  var plugins = jupyter.require(entryPoint);
  try {
    plugins = extractPlugins(plugins);
  } catch (err) {
    console.error(err);
    plugins = [];
  }
  return plugins;
}


jupyter.lab = new JupyterLab();
jupyter.getEntryPoint = getEntryPoint;
jupyter.version = require('../package.json').version;

module.exports = jupyter.lab;
