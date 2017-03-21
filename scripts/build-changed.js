#!/usr/bin/env node

/**
 * Build script for JupyterLab JavaScript packages.
 *
 * Only builds packages that have changed or whose
 * dependences have changed since the previous build.
 *
 * A dependency is considered changed if its TypeScipt
 * declaration file is changed.
 *
 * We also take into account css changes when Webpack
 * is used as the build tool.
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var glob = require('glob');
var minimatch = require('minimatch');
var minimist = require('minimist');


// Get all of the packages.
var basePath = path.resolve('.');
var lernaConfig = require(path.join(basePath, 'lerna.json'));
var packageConfig = lernaConfig.packages;
var packages = new Map();
var times = new Map();
var dtsTimes = new Map();
var styleTime = 0;
var paths = new Map();
var seen = new Set();

// Handle scope and ignore flags.
var argv = minimist(process.argv.slice(2));
var scope = argv['scope'] || '@jupyterlab/*';
var ignore = argv['ignore'] || '';


// Gather the package data.
for (var i = 0; i < packageConfig.length; i++) {
  var files = glob.sync(path.join(basePath, packageConfig[i]));
  for (var j = 0; j < files.length; j++) {
    gatherPackageData(files[j]);
  }
}

// Evalutate each package.
packages.forEach(processPackageAndDeps);


/**
 * Find the newest mtime in a directory.
 *
 * @param baseDir - the directory to search.
 *
 * @param match - an optional regexp for the file name.
 *
 * @returns the newest modification time as a number.
 */
function findNewest(baseDir, match) {
  var newest = 0;
  var files = fs.readdirSync(baseDir);
  for (var i = 0; i < files.length; i++) {
    var filepath = path.join(baseDir, files[i]);
    if (match && match.test(files[i])) {
      continue;
    }
    var mtime = fs.lstatSync(filepath).mtime.getTime();
    if (mtime > newest) {
      newest = mtime;
    }
  }
  return newest;
}


/**
 * Gather the package data associated with a file path.
 *
 * @param file - the pack to the package root.
 */
function gatherPackageData(file) {
  var packageData = require(path.join(file, 'package.json'));
  var name = packageData['name'];
  try {
    times.set(name, findNewest(path.join(file, 'src')));
  } catch (err) {
    times.set(name, -1);
  }
  // Update the max style time.
  try {
    styleTime = Math.max(styleTime, findNewest(path.join(file, 'style')));
  } catch (err) {
    // no-op
  }
  // Get the declaration file time.
  try {
    dtsTimes.set(name, findNewest(path.join(pkgPath, 'lib'), /.d.ts$/));
  } catch (err) {
    dtsTimes.set(name, -1);
  }
  packages.set(name, packageData);
  paths.set(name, file);
}


/**
 * Process a package, building if necessary.
 *
 * @param data - the package.json data.
 *
 * @param name - the name of the package.
 */
function processPackage(data, name) {
  if (!data.scripts || !data.scripts.build) {
    return;
  }

  if (!minimatch(name, scope) || minimatch(name, ignore)) {
    return;
  }

  var pkgPath = paths.get(name);
  var isWebpack = data.scripts.build.indexOf('webpack') !== -1;
  var target = isWebpack ? 'build' : 'lib';


  // Bail if there are no source files.
  if (!fs.existsSync(path.join(pkgPath, 'src'))) {
    return;
  }

  // Always build if there are not built files.
  if (!fs.existsSync(path.join(pkgPath, target))) {
    return buildPackage(name);
  }

  // Check for a stale build directory.
  if (!isWebpack && findNewest(path.join(pkgPath, 'lib')) < times.get(name)) {
    return buildPackage(name);
  }

  // Take into account the css time for webpack builds.
  var time = Math.max(times.get(name), styleTime);
  if (isWebpack) {
    debugger;
  }
  if (isWebpack && findNewest(path.join(pkgPath, 'build')) < time) {
    return buildPackage(name);
  }

}


/**
 * Build a package.
 */
function buildPackage(name) {
  var pkgPath = paths.get(name);
  childProcess.execSync('npm run build', { stdio: [0, 1, 2], cwd: pkgPath });
  // Update the declaration file time.
  try {
    dtsTimes.set(name, findNewest(path.join(pkgPath, 'lib'), /.d.ts$/));
  } catch (err) {
    dtsTimes.set(name, -1);
  }
}


/**
 * Process a package and its dependencies.
 *
 * @param data - the package.json data.
 *
 * @param name - the name of the package.
 */
function processPackageAndDeps(data, name) {
  if (seen.has(name)) {
    return;
  }
  for (var dep in data.dependencies) {
    if (!packages.has(dep)) {
      continue;
    }
    if (!seen.has(dep)) {
      processPackageAndDeps(packages.get(dep), dep);
    }
    times.set(name, Math.max(times.get(name), dtsTimes.get(dep)));
  }
  seen.add(name);
  processPackage(data, name);
}
