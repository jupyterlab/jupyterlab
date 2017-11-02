#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var utils = require('./utils');


// Make sure we have required command line arguments.
if (process.argv.length !== 3) {
  var msg = '** Must supply a library name\n';
  process.stderr.write(msg);
  process.exit(1);
}


var name = process.argv[2];

// Handle the packages
utils.getLernaPaths().forEach(function (pkgPath) {
  handlePackage(pkgPath);
});
handlePackage(path.resolve('.'));


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
  utils.ensurePackageData(data, packagePath);
}
