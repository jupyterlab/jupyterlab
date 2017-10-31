// Get the appropriate dependency for a package.
var childProcess = require('child_process');
var path = require('path');
var glob = require('glob');


// Ensure that the lerna package versions are the same everywhere
// Ensure that other singletonPackages are the same everywhere

// Look in all of the packages.
var basePath = path.resolve('.');
var files = glob.sync(path.join(basePath, 'packages/*'));
var packages = {};

// Pick up all the package versions.
for (var j = 0; j < files.length; j++) {
// Read in the package.json.
  var packagePath = path.join(files[j], 'package.json');
  try {
    var package = require(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    continue;
  }

  packages[package.name] = package.version;
}


// Get the other singletonPackages from jupyterlab/package.json


// Expand search to other lerna packages.


// Set the version to be the same everywhere


// Write out changed files using sort-package-json

