// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

var phosphide = require('phosphide/lib/core/application');

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('jupyterlab/lib/default-theme/index.css');

var app = new phosphide.Application({
  extensions: [
    require('phosphide/lib/extensions/commandpalette').commandPaletteExtension,
    require('jupyterlab/lib/terminal/plugin').terminalExtension,
    require('jupyterlab/lib/editorhandler/plugin').editorHandlerExtension,
    require('jupyterlab/lib/filebrowser/plugin').fileBrowserExtension,
    require('jupyterlab/lib/imagehandler/plugin').imageHandlerExtension,
    require('jupyterlab/lib/help/plugin').helpHandlerExtension,
    require('jupyterlab/lib/notebook/plugin').notebookHandlerExtension,
    require('jupyterlab/lib/shortcuts/plugin').shortcutsExtension,
    require('jupyterlab/lib/about/plugin').aboutExtension,
    require('jupyterlab/lib/landing/plugin').landingExtension,
    require('jupyterlab/lib/console/plugin').consoleExtension,
    require('jupyterlab/lib/main/plugin').mainExtension,
    require('jupyterlab/lib/widgets/plugin').widgetManagerExtension,
  ],
  providers: [
    require('jupyterlab/lib/clipboard/plugin').clipboardProvider,
    require('jupyterlab/lib/docregistry/plugin').docRegistryProvider,
    require('jupyterlab/lib/services/plugin').servicesProvider,
    require('jupyterlab/lib/rendermime/plugin').renderMimeProvider,
    require('jupyterlab/lib/notebook/plugin').activeNotebookProvider
  ]
});

window.onload = function() {
    app.run();
}
