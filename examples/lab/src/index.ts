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
    require('../../lib/terminal/plugin'),
    require('../../lib/fileopener/plugin'),
    require('../../lib/filehandler/plugin'),
    require('../../lib/filebrowser/plugin'),
    require('../../lib/notebook/plugin'),
    require('../../lib/services/plugin'),
    require('./plugin')
  ]).then(function() {
    console.log('loading finished');
  });
}

window.onload = main;
