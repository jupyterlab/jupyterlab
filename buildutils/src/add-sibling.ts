/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

/**
 * Add an extension to the source tree of JupyterLab.
 * It takes as an argument either a path to a directory
 * on the local filesystem or a URL to a git repository.
 * In the former case, it copies the directory into the
 * source tree, in the latter it adds the repository as
 * a git submodule.
 *
 * It also adds the relevant metadata to the build files.
 */

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
  let msg = '** Must supply a target extension';
  process.stderr.write(msg);
  process.exit(1);
}

// Extract the desired git repository and repository name.
let target = process.argv[2];
let basePath = path.resolve('.');
let packageDirName = path.basename(target);

let packagePath = path.resolve(target);
if (fs.existsSync(packagePath)) {
  // Copy the package directory contents to the sibling package.
  let newPackagePath = path.join(basePath, 'packages', packageDirName);
  fs.copySync(packagePath, newPackagePath);
  packagePath = newPackagePath;
} else {
  // Otherwise treat it as a git reposotory and try to add it.
  packageDirName = target
    .split('/')
    .pop()!
    .split('.')[0];
  packagePath = path.join(basePath, 'packages', packageDirName);
  utils.run('git clone ' + target + ' ' + packagePath);
}

// Remove any existing node_modules in the extension.
if (fs.existsSync(path.join(packagePath, 'node_modules'))) {
  fs.removeSync(path.join(packagePath, 'node_modules'));
}

// Make sure composite is set to true in the new package.
let packageTsconfigPath = path.join(packagePath, 'tsconfig.json');
if (fs.existsSync(packageTsconfigPath)) {
  let packageTsconfig = utils.readJSONFile(packageTsconfigPath);
  packageTsconfig.compilerOptions.composite = true;
  utils.writeJSONFile(packageTsconfigPath, packageTsconfig);
}

// Get the package.json of the extension.
let pkgJSONPath = path.join(packagePath, 'package.json');
let data = utils.readJSONFile(pkgJSONPath);
if (data.private !== true) {
  data.publishConfig = {};
  data.publishConfig.access = 'public';
  utils.writeJSONFile(pkgJSONPath, data);
}

// Add the extension path to packages/metapackage/tsconfig.json
let tsconfigPath = path.join(
  basePath,
  'packages',
  'metapackage',
  'tsconfig.json'
);
let tsconfig = utils.readJSONFile(tsconfigPath);
tsconfig.references.push({
  path: path.join('..', '..', packageDirName)
});
utils.writeJSONFile(tsconfigPath, tsconfig);

// Update the core jupyterlab build dependencies.
utils.run('jlpm run integrity');
