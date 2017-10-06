var data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

let names = Object.keys(data.jupyterlab.extensions).filter(function(name) {
  packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});
Build.ensureAssets({
  packageNames: names,
  output: '..'
});

// Hacks to be removed in 0.28 final release.
var path = require('path');
var fs = require('fs-extra');
var glob = require('glob');

Object.keys(data.jupyterlab.extensions).map(function(name) {
  packageData = require(name + '/package.json');
  if (packageData.jupyterlab === undefined) {
    return;
  }
  var schemaDir = packageData.jupyterlab.schemaDir;
  if (schemaDir === undefined) {
    return;
  }
  var files = glob.sync(path.join('.', 'node_modules', name, schemaDir));
  files.forEach(function(filePath) {
    var name = path.basename(filePath);
    fs.copySync(filePath, path.join('..', 'schemas', name));
  });
});