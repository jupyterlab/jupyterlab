import path = require('path');
import glob = require('glob');
import fs = require('fs-extra');
import childProcess = require('child_process');
import sortPackageJson = require('sort-package-json');


/**
 * Get all of the lerna package paths.
 */
export
function getLernaPaths(): string[] {
  let basePath = path.resolve('.');
  let lernaConfig = require(path.join(basePath, 'lerna.json'));
  let paths: string[] = [];
  for (let config of lernaConfig.packages) {
    paths = paths.concat(glob.sync(path.join(basePath, config)));
  }
  return paths;
}


/**
 * Get all of the core package paths.
 */
export
function getCorePaths(): string[] {
  let spec = path.resolve(path.join('.', 'packages', '*'));
  return glob.sync(spec);
}


/**
 * Write a package.json if necessary.
 *
 * @param data - The package data.
 *
 * @oaram pkgJsonPath - The path to the package.json file.
 *
 * @returns Whether the file has changed.
 */
export
function ensurePackageData(data: any, pkgJsonPath: string): boolean {
  let text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
  let orig = fs.readFileSync(pkgJsonPath, 'utf8');
  if (text !== orig) {
    fs.writeFileSync(pkgJsonPath, text, 'utf8');
    return true;
  }
  return false;
}

/**
 * Run a command with terminal output.
 *
 * @param cmd - The command to run.
 */
export
function run(cmd: string, options: childProcess.ExecSyncOptions = {}): void {
  options = options || {};
  options['stdio'] = [1, 2, 3];
  console.log('>', cmd);
  childProcess.execSync(cmd, options);
}
