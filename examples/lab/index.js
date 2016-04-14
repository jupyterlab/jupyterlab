// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

var phosphide = require('phosphide/lib/core/application');

require('es6-promise');  // Polyfill for IE11

require('jupyter-js-plugins/lib/default-theme/index.css');


var app = new phosphide.Application({
  extensions: [
    require('phosphide/lib/extensions/commandpalette').commandPaletteExtension,
    require('jupyter-js-plugins/lib/terminal/plugin').terminalExtension,
    require('jupyter-js-plugins/lib/filehandler/plugin').fileHandlerExtension,
    require('jupyter-js-plugins/lib/filebrowser/plugin').fileBrowserExtension,
    require('jupyter-js-plugins/lib/imagehandler/plugin').imageHandlerExtension,
    require('jupyter-js-plugins/lib/help/plugin').helpHandlerExtension,
    require('jupyter-js-plugins/lib/notebook/plugin').notebookHandlerExtension,
    require('jupyter-js-plugins/lib/shortcuts/plugin').shortcutsExtension,
    require('jupyter-js-plugins/lib/about/plugin').aboutExtension,
    require('jupyter-js-plugins/lib/main/plugin').mainExtension,
  ],
  providers: [
    require('jupyter-js-plugins/lib/documentmanager/plugin').documentManagerProvider,
    require('jupyter-js-plugins/lib/services/plugin').servicesProvider
  ]
});

window.onload = function() {
    app.run();
}
