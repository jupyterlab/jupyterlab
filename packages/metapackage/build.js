// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// After running typescript, move the built files to their individual lib
// folders
var fs = require('fs-extra');
var path = require('path');

var modules = fs.readdirSync('./lib');

modules.forEach(function(name) {
  if (name.indexOf('.') !== -1) {
    return;
  }
  var dest = path.join('..', name, 'lib');
  fs.copySync(path.join('./lib', name, 'src'), dest);
});
