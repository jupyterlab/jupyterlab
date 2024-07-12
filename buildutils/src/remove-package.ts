/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/**
 * Remove an extension from the relevant metadata
 * files of the JupyterLab source tree so that it
 * is not included in the build. Intended for testing
 * adding/removing extensions against development
 * branches of JupyterLab.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Make sure we have required command line arguments.
if (process.argv.length < 3) {
  const msg = '** Must supply a target extension name';
  process.stderr.write(msg);
  process.exit(1);
}

// Get the package name or path.
const target = process.argv[2];
const basePath = path.resolve('.');

// Get the package.json of the extension.
const packagePath = path.join(basePath, 'packages', target, 'package.json');
if (!fs.existsSync(packagePath)) {
  const msg = '** Absolute paths for packages are not allowed.';
  process.stderr.write(msg);
  process.exit(1);
}

// Remove the package from the local tree.
fs.removeSync(path.dirname(packagePath));

// Remove any dependencies on the package (will also run `jlpm integrity`)
utils.run(`jlpm remove:dependency ${target}`);
