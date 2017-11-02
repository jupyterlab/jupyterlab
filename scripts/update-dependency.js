#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var childProcess = require('child_process');
var utils = requier('./utils');


// Make sure we have required command line arguments.
if (process.argv.length !== 3) {
  var msg = '** Must supply an update specifier\n';
  process.stderr.write(msg);
  process.exit(1);
}

// Extract the desired library target and specifier.
var parts = process.argv[2].split('@');

// Translate @latest to a concrete version.
if (parts.length == 1 || parts[1] == 'latest') {
  var cmd = 'npm view ' + target + ' version';
  parts.push('~' + String(childProcess.execSync(cmd)).trim());
}
var name = parts[0];
var specifier = parts[1];


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
  if (target in data['dependencies']) {
    data['dependencies'][target] = specifier;
  } else if (target in data['devDependencies']) {
    data['devDependencies'][target] = specifier;
  }

  // Write the file back to disk.
  utils.ensurePackageData(data, packagePath);
}
