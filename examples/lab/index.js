// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('jupyterlab/lib/default-theme/index.css');


var mods = [
  require('../../lib/about/plugin'),
  require('../../lib/application/plugin'),
  require('../../lib/clipboard/plugin'),
  require('../../lib/codemirror/plugin'),
  require('../../lib/commandlinker/plugin'),
  require('../../lib/commandpalette/plugin'),
  require('../../lib/console/plugin'),
  require('../../lib/csvwidget/plugin'),
  require('../../lib/docmanager/plugin'),
  require('../../lib/docregistry/plugin'),
  require('../../lib/editorwidget/plugin'),
  require('../../lib/faq/plugin'),
  require('../../lib/filebrowser/plugin'),
  require('../../lib/help/plugin'),
  require('../../lib/imagewidget/plugin'),
  require('../../lib/inspector/plugin'),
  require('../../lib/landing/plugin'),
  require('../../lib/launcher/plugin'),
  require('../../lib/layoutrestorer/plugin'),
  require('../../lib/mainmenu/plugin'),
  require('../../lib/markdownwidget/plugin'),
  require('../../lib/notebook/plugin'),
  require('../../lib/rendermime/plugin'),
  require('../../lib/running/plugin'),
  require('../../lib/services/plugin'),
  require('../../lib/shortcuts/plugin'),
  require('../../lib/statedb/plugin'),
  require('../../lib/terminal/plugin')
];


var lab = new JupyterLab();
var plugins = [];
for (var i = 0; i < mods.length; i++) {
  var mod = mods[i];
  plugins = plugins.concat(mod.default);
}
lab.registerPlugins(plugins);

window.onload = function() { lab.start(); }
