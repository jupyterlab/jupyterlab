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
  require('jupyterlab/lib/commandlinker/plugin'),
  require('jupyterlab/lib/commandpalette/plugin'),
  require('jupyterlab/lib/completer-extension'),
  require('jupyterlab/lib/console-extension'),
  require('jupyterlab/lib/csvwidget/plugin'),
  require('jupyterlab/lib/docmanager/plugin'),
  require('jupyterlab/lib/docregistry/plugin'),
  require('jupyterlab/lib/editorwidget-extension'),
  require('jupyterlab/lib/faq-extension'),
  require('jupyterlab/lib/filebrowser/plugin'),
  require('jupyterlab/lib/help-extension'),
  require('jupyterlab/lib/imagewidget/plugin'),
  require('jupyterlab/lib/inspector/plugin'),
  require('jupyterlab/lib/landing-extension'),
  require('jupyterlab/lib/launcher/plugin'),
  require('jupyterlab/lib/mainmenu/plugin'),
  require('jupyterlab/lib/markdownwidget/plugin'),
  require('jupyterlab/lib/notebook/plugin'),
  require('jupyterlab/lib/rendermime/plugin'),
  require('jupyterlab/lib/running/plugin'),
  require('jupyterlab/lib/services/plugin'),
  require('jupyterlab/lib/shortcuts-extension'),
  require('jupyterlab/lib/statedb/plugin'),
  require('jupyterlab/lib/terminal/plugin'),
  require('jupyterlab/lib/tooltip/plugin')
];


window.onload = function() {
  var lab = new JupyterLab({ namespace: 'lab-example' });
  lab.registerPluginModules(mods);
  lab.start();
}
