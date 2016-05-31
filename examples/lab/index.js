// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

var phosphide = require('phosphide/lib/core/application');

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('jupyter-js-plugins/lib/default-theme/index.css');

var app = new phosphide.Application({
  extensions: [
    require('phosphide/lib/extensions/commandpalette').commandPaletteExtension,
    require('jupyter-js-plugins/lib/terminal/plugin').terminalExtension,
    require('jupyter-js-plugins/lib/editorhandler/plugin').editorHandlerExtension,
    require('jupyter-js-plugins/lib/filebrowser/plugin').fileBrowserExtension,
    require('jupyter-js-plugins/lib/imagehandler/plugin').imageHandlerExtension,
    require('jupyter-js-plugins/lib/help/plugin').helpHandlerExtension,
    require('jupyter-js-plugins/lib/notebook/plugin').notebookHandlerExtension,
    require('jupyter-js-plugins/lib/shortcuts/plugin').shortcutsExtension,
    require('jupyter-js-plugins/lib/about/plugin').aboutExtension,
    require('jupyter-js-plugins/lib/landing/plugin').landingExtension,
    require('jupyter-js-plugins/lib/console/plugin').consoleExtension,
    require('jupyter-js-plugins/lib/main/plugin').mainExtension,
    require('jupyter-js-plugins/lib/widgets/index').widgetManagerExtension,
  ],
  providers: [
    require('jupyter-js-plugins/lib/clipboard/plugin').clipboardProvider,
    require('jupyter-js-plugins/lib/docregistry/plugin').docRegistryProvider,
    require('jupyter-js-plugins/lib/services/plugin').servicesProvider,
    require('jupyter-js-plugins/lib/rendermime/plugin').renderMimeProvider,
    require('jupyter-js-plugins/lib/notebook/plugin').activeNotebookProvider
  ]
});

window.onload = function() {
    app.run();
}
