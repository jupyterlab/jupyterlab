var rpt = require('read-package-tree');
var data = require('./package.json');
var path = require('path');
var glob = require('glob');
var fs = require('fs-extra');

var seen = {};

var schemaDir = path.resolve('./schemas');
fs.removeSync(schemaDir);
fs.ensureDirSync(schemaDir);

var themesDir = path.resolve('./themes');
fs.removeSync(themesDir);
fs.ensureDirSync(themesDir);


function extractNode(data) {
  data.children.forEach(function(child) {
    extractNode(child);
  });

  if (seen[data.package.name]) {
    return;
  }
  seen[data.package.name] = true;
  var jlab = data.package.jupyterlab
  if (!jlab) {
    return;
  }

  // Handle schemas.
  var schemaDir = jlab['schemaDir'];
  if (schemaDir) {
    debugger;
    schemaDir = path.join(data.realpath, schemaDir);
    var schemas = glob.sync(path.join(schemaDir, '*'));
    schemas.forEach(function(schemaPath) {
      var file = path.basename(schemaPath);
      var to = path.join('schemas', file);
      fs.copySync(schemaPath, to);
    });
  }

  // Handle themes.
  var themeDir = jlab['themeDir'];
  if (themeDir) {
    var name = data.package.name.replace('@', '');
    name = name.replace('/', '-');
    var from = path.join(data.realpath, themeDir);
    var to = path.join('themes', name);
    fs.copySync(from, to);
  }
}


rpt('.', function (er, data) {
  extractNode(data);
})
