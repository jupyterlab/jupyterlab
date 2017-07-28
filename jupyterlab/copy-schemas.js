var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

var schemaDir = path.resolve('./schemas');
fs.removeSync(schemaDir);
fs.ensureDirSync(schemaDir);

var corePackage = require('./package.json');
var extensions = {};
var mimeExtensions = {};

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

  // // Handle extensions.
  // if (jlab['extension']) {
  //   var ext = jlab['extension'];
  //   if (ext === true) {
  //     ext = '';
  //   }
  //   extensions[data['name']] = ext;
  // }

  // // Handle mime extensions.
  //   if (jlab['extension']) {
  //   var ext = jlab['extension'];
  //   if (ext === true) {
  //     ext = '';
  //   }
  //   extensions[data['name']] = ext;
  // }

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

// corePackage['jupyterlab']['extensions'] = extensions;
// copyPackage['jupyterlab']['mimeExtensions'] = mimeExtensions;
