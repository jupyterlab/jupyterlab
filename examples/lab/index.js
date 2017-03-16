// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('@jupyterlab/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('@jupyterlab/default-theme/style/index.css');


var mods = [
  require('@jupyterlab/about-extension'),
  require('@jupyterlab/application-extension'),
  require('@jupyterlab/apputils-extension'),
  require('@jupyterlab/codemirror-extension'),
  require('@jupyterlab/completer-extension'),
  require('@jupyterlab/console-extension'),
  require('@jupyterlab/csvwidget-extension'),
  require('@jupyterlab/docmanager-extension'),
  require('@jupyterlab/docregistry-extension'),
  require('@jupyterlab/editorwidget-extension'),
  require('@jupyterlab/faq-extension'),
  require('@jupyterlab/filebrowser-extension'),
  require('@jupyterlab/help-extension'),
  require('@jupyterlab/imagewidget-extension'),
  require('@jupyterlab/inspector-extension'),
  require('@jupyterlab/landing-extension'),
  require('@jupyterlab/launcher-extension'),
  require('@jupyterlab/markdownwidget-extension'),
  require('@jupyterlab/notebook-extension'),
  require('@jupyterlab/rendermime-extension'),
  require('@jupyterlab/running-extension'),
  require('@jupyterlab/services-extension'),
  require('@jupyterlab/shortcuts-extension'),
  require('@jupyterlab/terminal-extension'),
  require('@jupyterlab/tooltip-extension')
];


window.onload = function() {
  var lab = new JupyterLab({ namespace: 'lab-example' });
  lab.registerPluginModules(mods);
  lab.start();
}
