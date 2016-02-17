// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

var phosphide = require('phosphide');
var di = require('phosphor-di');


function main() {
   phosphide.loadPlugins(new di.Container(), [
    require('phosphide/lib/appshell/plugin'),
    require('phosphide/lib/commandregistry/plugin'),
    require('phosphide/lib/commandpalette/plugin'),
    require('phosphide/lib/shortcutmanager/plugin'),
    require('jupyter-js-plugins/lib/terminal/plugin'),
    require('jupyter-js-plugins/lib/documentmanager/plugin'),
    require('jupyter-js-plugins/lib/filehandler/plugin'),
    require('jupyter-js-plugins/lib/filebrowser/plugin'),
    require('jupyter-js-plugins/lib/imagehandler/plugin'),
    require('jupyter-js-plugins/lib/help/plugin'),
    require('jupyter-js-plugins/lib/notebook/plugin'),
    require('jupyter-js-plugins/lib/services/plugin'),
    require('jupyter-js-plugins/lib/application/plugin')
  ]).then(function() {
    console.log('loading finished');
  });
}

window.onload = main;
