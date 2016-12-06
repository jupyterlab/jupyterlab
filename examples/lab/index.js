// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('jupyterlab/lib/default-theme/index.css');


var lab = new JupyterLab();

lab.registerPlugins([
  require('jupyterlab/lib/about/plugin').plugin,
  require('jupyterlab/lib/application/plugin').plugin,
  require('jupyterlab/lib/clipboard/plugin').plugin,
  require('jupyterlab/lib/codemirror/plugin').servicesPlugin,
  require('jupyterlab/lib/codemirror/plugin').commandsPlugin,
  require('jupyterlab/lib/commandlinker/plugin').plugin,
  require('jupyterlab/lib/commandpalette/plugin').plugin,
  require('jupyterlab/lib/console/plugin').plugin,
  require('jupyterlab/lib/docregistry/plugin').plugin,
  require('jupyterlab/lib/docmanager/plugin').plugin,
  require('jupyterlab/lib/editorwidget/plugin').plugin,
  require('jupyterlab/lib/faq/plugin').plugin,
  require('jupyterlab/lib/filebrowser/plugin').plugin,
  require('jupyterlab/lib/help/plugin').plugin,
  require('jupyterlab/lib/imagewidget/plugin').plugin,
  require('jupyterlab/lib/inspector/plugin').plugin,
  require('jupyterlab/lib/landing/plugin').plugin,
  require('jupyterlab/lib/launcher/plugin').plugin,
  require('jupyterlab/lib/layoutrestorer/plugin').plugin,
  require('jupyterlab/lib/mainmenu/plugin').plugin,
  require('jupyterlab/lib/markdownwidget/plugin').plugin,
  require('jupyterlab/lib/notebook/plugin').plugin,
  require('jupyterlab/lib/rendermime/plugin').plugin,
  require('jupyterlab/lib/running/plugin').plugin,
  require('jupyterlab/lib/services/plugin').plugin,
  require('jupyterlab/lib/shortcuts/plugin').plugin,
  require('jupyterlab/lib/statedb/plugin').plugin,
  require('jupyterlab/lib/terminal/plugin').plugin
]);

window.onload = function() { lab.start(); }
