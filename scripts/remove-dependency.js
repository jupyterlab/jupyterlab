#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var childProcess = require('child_process');
var sortPackageJson = require('sort-package-json');


// Make sure we have required command line arguments.
if (process.argv.length !== 3) {
  var msg = '** Must supply a library name\n';
  process.stderr.write(msg);
  process.exit(1);
}


var name = process.argv[2];

// Get all of the packages.
var basePath = path.resolve('.');
var lernaConfig = require(path.join(basePath, 'lerna.json'));
var packageConfig = lernaConfig.packages;


// Handle the packages
for (var i = 0; i < packageConfig.length; i++) {
  var files = glob.sync(path.join(basePath, packageConfig[i]));
  for (var j = 0; j < files.length; j++) {
    handlePackage(files[j]);
  }
}
handlePackage(basePath);


/**
 * Handle an individual package on the path - update the dependency.
 */
function handlePackage(packagePath) {
  // Read in the package.json.
  var packagePath = path.join(packagePath, 'package.json');
  try {
    var data = require(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }

  // Update dependencies as appropriate.
  if (name in data['dependencies']) {
    delete data['dependencies'][name];
  } else if (name in data['devDependencies']) {
    delete data['devDependencies'][name];
  }

  // Write the file back to disk.
  var text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
  fs.writeFileSync(packagePath, text);
}
