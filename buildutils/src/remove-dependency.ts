#!/usr/bin/env node
/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';

// Make sure we have required command line arguments.
if (process.argv.length !== 3) {
  let msg = '** Must supply a library name\n';
  process.stderr.write(msg);
  process.exit(1);
}

let name = process.argv[2];

// Handle the packages
utils.getLernaPaths().forEach(pkgPath => {
  handlePackage(pkgPath);
});
handlePackage(path.resolve('.'));

/**
 * Handle an individual package on the path - update the dependency.
 */
function handlePackage(packagePath: string): void {
  // Read in the package.json.
  packagePath = path.join(packagePath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }

  // Update dependencies as appropriate.
  for (let dtype of ['dependencies', 'devDependencies']) {
    let deps = data[dtype] || {};
    delete deps[name];
  }

  // Write the file back to disk.
  utils.writePackageData(packagePath, data);
}

// Update the core jupyterlab build dependencies.
utils.run('jlpm run integrity');
