#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var childProcess = require('child_process');

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
    var msg = '** Must supply a target extension';
    process.stderr.write(msg);
    process.exit(1);
}

// Extract the desired git repository and repository name.
var target = process.argv[2];
var basePath = path.resolve('.');

var packagePath = '';
if (target[0] === '.' || target[0] === '/') {
  // If the target starts with a '.' or a '/', treat it as a local path.
  packagePath = path.resolve(target);
  packageDirName = target.split('/').pop();
  // Create a symbolic link to the package.
  var linkPath = path.join(basePath, 'packages', packageDirName);
  childProcess.execSync('cp -r ' + packagePath + ' ' + linkPath);

} else { 
  // Otherwise treat it as a git reposotory and try to add it.
  var packageDirName = target.split('/').pop().split('.')[0];
  var packagePath = path.join(basePath, 'packages', packageDirName);
  // Add the repository as a submodule.
  childProcess.execSync('git submodule add --force '+ target + ' ' + packagePath);
}

// Get the package.json of the submodule.
var package = require(path.join(packagePath, 'package.json'));

// Add the submodule to packages/all-packages/package.json
var allPackagesPath = path.join(basePath, 'packages', 'all-packages', 'package.json');
var allPackages = require(allPackagesPath);
allPackages.dependencies[package.name] = '~'+String(package.version);
fs.writeFileSync(allPackagesPath, JSON.stringify(allPackages, null, 2) + '\n');

// Add the submodule to packages/all-packages/src/index.ts
var indexPath = path.join(basePath, 'packages', 'all-packages', 'src', 'index.ts');
var index = fs.readFileSync(indexPath);
index = index + 'import "' + package.name + '";\n';
fs.writeFileSync(indexPath, index);

// Add the submodule to jupyterlab/package.json
var jupyterlabPackagePath = path.join(basePath, 'jupyterlab', 'package.json');
var jupyterlabPackage = require(jupyterlabPackagePath);
jupyterlabPackage.dependencies[package.name] = '~'+String(package.version);
jupyterlabPackage.jupyterlab.extensions.push(package.name);
fs.writeFileSync(jupyterlabPackagePath, JSON.stringify(jupyterlabPackage, null, 2) + '\n');

// Add the submodule to jupyterlab/package_list.txt
var packageListPath = path.join(basePath, 'jupyterlab', 'package_list.txt');
var packageList = fs.readFileSync(packageListPath);
packageList = packageList + '    ~'+String(package.version)+'\n';
fs.writeFileSync(packageListPath, packageList);
