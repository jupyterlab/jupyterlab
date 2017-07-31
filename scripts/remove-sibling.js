#!/usr/bin/env node

/**
 * Remove an extension from the relevant metadata
 * files of the JupyterLab source tree so that it
 * is not included in the build. Intended for testing
 * adding/removing extensions against development
 * branches of JupyterLab.
 *
 * Note: this does not remove any files or submodules
 * that may have been copied by the add-sibling.js
 * script, and as such they are not true inverses of
 * each other.
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
    var msg = '** Must supply a target extension name';
    process.stderr.write(msg);
    process.exit(1);
}

// Get the repository name.
var target = process.argv[2];
var basePath = path.resolve('.');

// Get the package.json of the extension.
var packagePath = path.join(basePath, 'packages', target);
var package = require(path.join(packagePath, 'package.json'));

// Remove the extension from packages/all-packages/package.json
var allPackagesPath = path.join(basePath, 'packages', 'all-packages', 'package.json');
var allPackages = require(allPackagesPath);
allPackages.dependencies[package.name] = undefined;
fs.writeFileSync(allPackagesPath, JSON.stringify(allPackages, null, 2) + '\n');

// Remove the extension path from packages/all-packages/tsconfig.json
var tsconfigPath = path.join(basePath, 'packages', 'all-packages', 'tsconfig.json');
var tsconfig = require(tsconfigPath);
tsconfig.compilerOptions.paths[package.name] = undefined;
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');

// Remove the extension from packages/all-packages/src/index.ts
var indexPath = path.join(basePath, 'packages', 'all-packages', 'src', 'index.ts');
var index = fs.readFileSync(indexPath, 'utf8');
var indexEntries = index.split('\n');
var indexEntries = indexEntries.filter(function(e) {
  return e.indexOf(package.name) === -1;
});
fs.writeFileSync(indexPath, indexEntries.join('\n'));
