// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

var phosphide = require('phosphide');
var di = require('phosphor-di');


function main() {
   phosphide.loadPlugins(new di.Container(), [
    require('phosphide/lib/appshell/plugin'),
    require('jupyter-js-editor/lib/plugin'),
    require('jupyter-js-terminal/lib/plugin'),
    require('jupyter-js-filebrowser/lib/plugin')
  ]).then(function() {
    console.log('loading finished');
  });
}

window.onload = main;
