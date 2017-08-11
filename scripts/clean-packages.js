#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var childProcess = require('child_process');


// Get all of the packages.
var basePath = path.resolve('.');
var lernaConfig = require(path.join(basePath, 'lerna.json'));
var packageConfig = lernaConfig.packages;
var skipSource = process.argv.indexOf('packages') === -1;
var skipExamples = process.argv.indexOf('examples') === -1;


// Handle the packages
for (var i = 0; i < packageConfig.length; i++) {
  if (skipSource && packageConfig[i] === 'packages/*') {
    continue;
  }
  if (skipExamples && packageConfig[i] === 'examples/*') {
    continue;
  }
  var files = glob.sync(path.join(basePath, packageConfig[i]));
  for (var j = 0; j < files.length; j++) {
    try {
      handlePackage(files[j]);
    } catch (e) {
      console.error(e);
    }
  }
}


/**
 * Handle an individual package on the path - update the dependency.
 */
function handlePackage(packagePath) {
  // Read in the package.json.
  var packagePath = path.join(packagePath, 'package.json');
  try {
    var package = require(packagePath);
  } catch (e) {
    console.log('skipping', packagePath);
    return
  }
  if (!package.scripts || !package.scripts.clean) {
    return;
  }
  var targets = package.scripts.clean.split('&&');
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i].replace('rimraf', '').trim();
    target = path.join(packagePath, target);
    if (fs.existsSync(target)) {
      fs.removeSync(target);
    }
  }
}
