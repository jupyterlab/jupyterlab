import path = require('path');
import glob = require('glob');
import fs = require('fs-extra');
import childProcess = require('child_process');
import sortPackageJson = require('sort-package-json');

/**
 * Get all of the lerna package paths.
 */
export function getLernaPaths(): string[] {
  let basePath = path.resolve('.');
  let baseConfig = require(path.join(basePath, 'package.json'));
  let paths: string[] = [];
  for (let config of baseConfig.workspaces) {
    paths = paths.concat(glob.sync(path.join(basePath, config)));
  }
  return paths.filter(pkgPath => {
    return fs.existsSync(path.join(pkgPath, 'package.json'));
  });
}

/**
 * Get all of the core package paths.
 */
export function getCorePaths(): string[] {
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
export function writePackageData(pkgJsonPath: string, data: any): boolean {
  let text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
  let orig = fs
    .readFileSync(pkgJsonPath, 'utf8')
    .split('\r\n')
    .join('\n');
  if (text !== orig) {
    fs.writeFileSync(pkgJsonPath, text, 'utf8');
    return true;
  }
  return false;
}

/**
 * Read a package.json file.
 */
export function readJSONFile(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Run a command with terminal output.
 *
 * @param cmd - The command to run.
 */
export function run(
  cmd: string,
  options: childProcess.ExecSyncOptions = {}
): void {
  options = options || {};
  options['stdio'] = [0, 1, 2];
  console.log('>', cmd);
  childProcess.execSync(cmd, options);
}
