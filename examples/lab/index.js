// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('jupyterlab/lib/default-theme/index.css');


var mods = [
  require('jupyterlab/lib/plugin-about'),
  require('jupyterlab/lib/application/plugin'),
  require('jupyterlab/lib/codemirror/plugin'),
  require('jupyterlab/lib/commandlinker/plugin'),
  require('jupyterlab/lib/commandpalette/plugin'),
  require('jupyterlab/lib/completer/plugin'),
  require('jupyterlab/lib/console/plugin'),
  require('jupyterlab/lib/csvwidget/plugin'),
  require('jupyterlab/lib/docmanager/plugin'),
  require('jupyterlab/lib/docregistry/plugin'),
  require('jupyterlab/lib/editorwidget/plugin'),
  require('jupyterlab/lib/plugin-faq'),
  require('jupyterlab/lib/filebrowser/plugin'),
  require('jupyterlab/lib/help/plugin'),
  require('jupyterlab/lib/imagewidget/plugin'),
  require('jupyterlab/lib/inspector/plugin'),
  require('jupyterlab/lib/landing/plugin'),
  require('jupyterlab/lib/launcher/plugin'),
  require('jupyterlab/lib/instancerestorer/plugin'),
  require('jupyterlab/lib/mainmenu/plugin'),
  require('jupyterlab/lib/markdownwidget/plugin'),
  require('jupyterlab/lib/notebook/plugin'),
  require('jupyterlab/lib/rendermime/plugin'),
  require('jupyterlab/lib/running/plugin'),
  require('jupyterlab/lib/services/plugin'),
  require('jupyterlab/lib/shortcuts/plugin'),
  require('jupyterlab/lib/statedb/plugin'),
  require('jupyterlab/lib/terminal/plugin'),
  require('jupyterlab/lib/tooltip/plugin')
];


window.onload = function() {
  var lab = new JupyterLab({ namespace: 'lab-example' });
  lab.registerPluginModules(mods);
  lab.start();
}
