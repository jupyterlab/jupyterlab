// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterPluginRegistry, PageConfig } from '@jupyterlab/coreutils';
import { IConnectionStatus, IServiceManager } from '@jupyterlab/services';
// eslint-disable-next-line
__webpack_public_path__ = PageConfig.getOption('fullStaticUrl') + '/';

// This must be after the public path is set.
// This cannot be extracted because the public path is dynamic.
require('./build/imports.css');

/**
 * Get the plugins from an extension.
 */
function getPlugins(extension) {
  // Handle commonjs or es2015 modules
  let exports;
  if (extension.hasOwnProperty('__esModule')) {
    exports = extension.default;
  } else {
    // CommonJS exports.
    exports = extension;
  }

  return Array.isArray(exports) ? exports : [exports];
}

window.addEventListener('load', async function () {
  var JupyterLab = require('@jupyterlab/application').JupyterLab;

  var mods = [
    require('@jupyterlab/application-extension'),
    require('@jupyterlab/apputils-extension'),
    require('@jupyterlab/codemirror-extension'),
    require('@jupyterlab/completer-extension'),
    require('@jupyterlab/console-extension'),
    require('@jupyterlab/csvviewer-extension'),
    require('@jupyterlab/docmanager-extension'),
    require('@jupyterlab/extensionmanager-extension'),
    require('@jupyterlab/fileeditor-extension'),
    require('@jupyterlab/filebrowser-extension'),
    require('@jupyterlab/help-extension'),
    require('@jupyterlab/imageviewer-extension'),
    require('@jupyterlab/inspector-extension'),
    require('@jupyterlab/launcher-extension'),
    require('@jupyterlab/mainmenu-extension'),
    require('@jupyterlab/markdownviewer-extension'),
    require('@jupyterlab/mathjax-extension'),
    require('@jupyterlab/notebook-extension'),
    require('@jupyterlab/rendermime-extension'),
    require('@jupyterlab/running-extension'),
    require('@jupyterlab/services-extension'),
    require('@jupyterlab/settingeditor-extension'),
    require('@jupyterlab/shortcuts-extension'),
    require('@jupyterlab/statusbar-extension'),
    require('@jupyterlab/terminal-extension'),
    require('@jupyterlab/theme-dark-extension'),
    require('@jupyterlab/theme-light-extension'),
    require('@jupyterlab/tooltip-extension'),
    require('@jupyterlab/ui-components-extension')
  ];

  var pluginRegistry = new JupyterPluginRegistry();
  var plugins = [];
  for (var mod of mods) {
    plugins.push(...getPlugins(mod));
  }
  pluginRegistry.registerPlugins(plugins);

  var connectionStatus =
    await pluginRegistry.resolveOptionalService(IConnectionStatus);
  var serviceManager =
    await pluginRegistry.resolveRequiredService(IServiceManager);

  var lab = new JupyterLab({
    pluginRegistry,
    serviceManager,
    connectionStatus
  });
  /* eslint-disable no-console */
  console.log('Starting app');
  await lab.start();
  console.log('App started, waiting for restore');
  await lab.restored;
  console.log('Example started!');
});
