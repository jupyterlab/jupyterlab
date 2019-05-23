// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
// eslint-disable-next-line
__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/static/'
);

window.addEventListener('load', function() {
  require('font-awesome/css/font-awesome.min.css');
  var JupyterLab = require('@jupyterlab/application').JupyterLab;

  var mods = [
    require('@jupyterlab/application-extension'),
    require('@jupyterlab/apputils-extension'),
    require('@jupyterlab/codemirror-extension'),
    require('@jupyterlab/completer-extension'),
    require('@jupyterlab/console-extension'),
    require('@jupyterlab/csvviewer-extension'),
    require('@jupyterlab/docmanager-extension'),
    require('@jupyterlab/fileeditor-extension'),
    require('@jupyterlab/filebrowser-extension'),
    require('@jupyterlab/help-extension'),
    require('@jupyterlab/imageviewer-extension'),
    require('@jupyterlab/inspector-extension'),
    require('@jupyterlab/launcher-extension'),
    require('@jupyterlab/mainmenu-extension'),
    require('@jupyterlab/markdownviewer-extension'),
    require('@jupyterlab/mathjax2-extension'),
    require('@jupyterlab/notebook-extension'),
    require('@jupyterlab/rendermime-extension'),
    require('@jupyterlab/running-extension'),
    require('@jupyterlab/settingeditor-extension'),
    require('@jupyterlab/shortcuts-extension'),
    require('@jupyterlab/tabmanager-extension'),
    require('@jupyterlab/terminal-extension'),
    require('@jupyterlab/theme-dark-extension'),
    require('@jupyterlab/theme-light-extension'),
    require('@jupyterlab/tooltip-extension')
  ];
  var lab = new JupyterLab({
    name: 'JupyterLab Example',
    namespace: 'lab-example',
    version: require('./package.json').version
  });
  lab.registerPluginModules(mods);
  lab.start().then(() => {
    // eslint-disable-next-line
    console.log('Example started!');
  });
});
