var path = require('path');
var glob = require('glob');
var fs = require('fs-extra');
var childProcess = require('child_process');
var sortPackageJson = require('sort-package-json');


/**
 * Get all of the lerna package paths.
 */
function getLernaPaths() {
  var basePath = path.resolve('.');
  var lernaConfig = require(path.join(basePath, 'lerna.json'));
  var paths = [];
  for (var config of lernaConfig.packages) {
    paths = paths.concat(glob.sync(path.join(basePath, config)));
  }
  return paths;
}

/**
 * Get all of the core package paths.
 */
function getCorePaths() {
  var spec = path.resolve(path.join('.', 'packages', '*'));
  return glob.sync(spec);
}


/**
 * Write a package.json if necessary.
 */
function ensurePackageData(data, pkgJsonPath) {
  var text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
  var orig = fs.readFileSync(pkgJsonPath).toString();
  if (text !== orig) {
    fs.writeFileSync(pkgJsonPath, text);
    return true;
  }
  return false;
}

/**
 * Run a command with terminal output.
 */
function run(cmd, options) {
  options = options || {};
  options['stdio'] = [1,2,3];
  console.log('>', cmd);
  childProcess.execSync(cmd, options);
}


module.exports = {
  getLernaPaths: getLernaPaths,
  getCorePaths: getCorePaths,
  ensurePackageData: ensurePackageData,
  run: run
};
