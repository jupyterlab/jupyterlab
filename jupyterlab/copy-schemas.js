var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

var schemaDir = path.resolve('./schemas');
fs.removeSync(schemaDir);
fs.ensureDirSync(schemaDir);

var basePath = path.resolve('..');
var packages = glob.sync(path.join(basePath, 'packages/*'));
packages.forEach(function(packagePath) {
   var dataPath = path.join(packagePath, 'package.json');
   try {
    var data = require(dataPath);
  } catch (e) {
    return;
  }
  var schemas = data['jupyterlab'] && data['jupyterlab']['schemas'];
  if (!schemas) {
    return;
  }
  schemas.forEach(function(schemaPath) {
    var file = path.basename(schemaPath);
    var from = path.join(packagePath, schemaPath)
    var to = path.join(basePath, 'jupyterlab', 'schemas', file);
    fs.copySync(from, to);
  });
});
