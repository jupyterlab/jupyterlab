// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// ES6 Promise polyfill
require('es6-promise/auto');

// Load the core theming before any other package.
require('@jupyterlab/theme-light-extension/style/embed.css');

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
  require('@jupyterlab/faq-extension'),
  require('@jupyterlab/filebrowser-extension'),
  require('@jupyterlab/help-extension'),
  require('@jupyterlab/imageviewer-extension'),
  require('@jupyterlab/inspector-extension'),
  require('@jupyterlab/launcher-extension'),
  require('@jupyterlab/markdownviewer-extension'),
  require('@jupyterlab/notebook-extension'),
  require('@jupyterlab/running-extension'),
  require('@jupyterlab/settingeditor-extension'),
  require('@jupyterlab/shortcuts-extension'),
  require('@jupyterlab/tabmanager-extension'),
  require('@jupyterlab/terminal-extension'),
  require('@jupyterlab/tooltip-extension')
];


window.onload = function() {
  var lab = new JupyterLab({
    name: 'JupyterLab Example',
    namespace: 'lab-example',
    version: require('./package.json').version
  });
  lab.registerPluginModules(mods);
  lab.start();
}
