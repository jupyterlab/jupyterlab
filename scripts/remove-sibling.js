#!/usr/bin/env node

/**
 * Remove an extension from the relevant metadata
 * files of the JupyterLab source tree so that it
 * is not included in the build. Intended for testing
 * adding/removing extensions against development
 * branches of JupyterLab.
 */

var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
    var msg = '** Must supply a target extension name';
    process.stderr.write(msg);
    process.exit(1);
}

// Get the package name or path.
var target = process.argv[2];
var basePath = path.resolve('.');

// Get the package.json of the extension.
var packagePath = path.join(basePath, 'packages', target, 'package.json');
if (!fs.existsSync(packagePath)) {
    packagePath = require.resolve(path.join(target, 'package.json'));
}
var package = require(packagePath);

// Remove the extension path from packages/all-packages/tsconfig.json
var tsconfigPath = path.join(basePath, 'packages', 'all-packages', 'tsconfig.json');
var tsconfig = require(tsconfigPath);
tsconfig.compilerOptions.paths[package.name] = undefined;
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');

// Remove the package from the local tree.
fs.removeSync(path.dirname(packagePath));

// Update the core jupyterlab build dependencies.
childProcess.execSync('npm run update:core', {stdio:[0,1,2]});
