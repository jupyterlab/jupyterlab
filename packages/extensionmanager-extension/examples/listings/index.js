// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
// eslint-disable-next-line
__webpack_public_path__ = PageConfig.getOption('fullStaticUrl') + '/';

// This must be after the public path is set.
// This cannot be extracted because the public path is dynamic.
require('./build/imports.css');

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
    require('@jupyterlab/settingeditor-extension'),
    require('@jupyterlab/shortcuts-extension'),
    require('@jupyterlab/statusbar-extension'),
    require('@jupyterlab/terminal-extension'),
    require('@jupyterlab/theme-dark-extension'),
    require('@jupyterlab/theme-light-extension'),
    require('@jupyterlab/tooltip-extension'),
    require('@jupyterlab/ui-components-extension')
  ];
  var lab = new JupyterLab();
  lab.registerPluginModules(mods);
  /* eslint-disable no-console */
  console.log('Starting app');
  await lab.start();
  console.log('App started, waiting for restore');
  await lab.restored;
  console.log('Example started!');
});
