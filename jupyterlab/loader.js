// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var ModuleLoader = require('@jupyterlab/extension-builder/lib/loader').ModuleLoader;
var extractPlugins = require('@jupyterlab/extension-builder/lib/extract').extractPlugins;

var loader = new ModuleLoader();
var requireFunc = loader.require.bind(loader);


/**
 * Get an entry point given by the user after validating.
 */
function getEntryPoint(entryPoint) {
  var plugins = requireFunc(entryPoint);
  try {
    plugins = extractPlugins(plugins);
  } catch (err) {
    console.error(err);
    plugins = [];
  }
  return plugins;
}


module.exports = {
  define: loader.define.bind(loader),
  require: requireFunc,
  requireBundle: loader.ensureBundle.bind(loader),
  getEntryPoint: getEntryPoint
}
