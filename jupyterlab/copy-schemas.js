var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

var schemaDir = path.resolve('./schemas');
fs.removeSync(schemaDir);
fs.ensureDirSync(schemaDir);

var corePackage = require('./package.json');
corePackage.jupyterlab.extensions = {};
corePackage.jupyterlab.mimeExtensions = {};
corePackage.jupyterlab.themeExtensions = {};

var basePath = path.resolve('..');
var packages = glob.sync(path.join(basePath, 'packages/*'));
packages.forEach(function(packagePath) {
   var dataPath = path.join(packagePath, 'package.json');
   try {
    var data = require(dataPath);
  } catch (e) {
    return;
  }
  var jlab = data['jupyterlab'];
  if (!jlab) {
    return;
  }

  // Handle extensions.
  ['extension', 'mimeExtension', 'themeExtension'].forEach(function(item) {
    var ext = jlab[item];
    if (ext === true) {
      ext = ''
    }
    if (typeof ext !== 'string') {
      return;
    }
    corePackage.jupyterlab[item + 's'][data['name']] = ext;

  });

  // Handle schemas.
  var schemas = jlab['schemas'];
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


// Write the package.json back to disk.
var text = JSON.stringify(sortPackageJson(corePackage), null, 2) + '\n';
fs.writeFileSync('./package.json', text);
