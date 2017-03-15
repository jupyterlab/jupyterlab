// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('jupyterlab/lib/default-theme/index.css');


var mods = [
  require('jupyterlab/lib/about-extension'),
  require('jupyterlab/lib/application-extension'),
  require('jupyterlab/lib/apputils-extension'),
  require('jupyterlab/lib/codemirror-extension'),
  require('jupyterlab/lib/completer-extension'),
  require('jupyterlab/lib/console-extension'),
  require('jupyterlab/lib/csvwidget-extension'),
  require('jupyterlab/lib/docmanager-extension'),
  require('jupyterlab/lib/docregistry-extension'),
  require('jupyterlab/lib/editorwidget-extension'),
  require('jupyterlab/lib/faq-extension'),
  require('jupyterlab/lib/filebrowser-extension'),
  require('jupyterlab/lib/help-extension'),
  require('jupyterlab/lib/imagewidget-extension'),
  require('jupyterlab/lib/inspector-extension'),
  require('jupyterlab/lib/landing-extension'),
  require('jupyterlab/lib/launcher-extension'),
  require('jupyterlab/lib/markdownwidget-extension'),
  require('jupyterlab/lib/notebook-extension'),
  require('jupyterlab/lib/rendermime-extension'),
  require('jupyterlab/lib/running-extension'),
  require('jupyterlab/lib/services-extension'),
  require('jupyterlab/lib/shortcuts-extension'),
  require('jupyterlab/lib/terminal-extension'),
  require('jupyterlab/lib/tooltip-extension')
];


window.onload = function() {
  var lab = new JupyterLab({ namespace: 'lab-example' });
  lab.registerPluginModules(mods);
  lab.start();
}
