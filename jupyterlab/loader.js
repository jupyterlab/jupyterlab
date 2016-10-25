// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var ModuleLoader = require('@jupyterlab/extension-builder/lib/loader').ModuleLoader;

var loader = new ModuleLoader();

module.exports = {
  define: loader.define.bind(loader),
  require: loader.require.bind(loader),
  requireBundle: loader.ensureBundle.bind(loader)
}
