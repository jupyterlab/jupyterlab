/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as childProcess from 'child_process';
import * as utils from './utils';


// Make sure we have required command line arguments.
if (process.argv.length !== 3) {
  let msg = '** Must supply an update specifier\n';
  process.stderr.write(msg);
  process.exit(1);
}

// Extract the desired library target and specifier.
let parts = process.argv[2].slice(1).split('@');
parts[0] = process.argv[2][0] + parts[0];

// Translate @latest to a concrete version.
if (parts.length === 1 || parts[1] === 'latest') {
  let cmd = 'npm view ' + parts[0] + ' version';
  let version = String(childProcess.execSync(cmd)).trim();
  parts = [parts[0], `~${version}`];
}
let name = parts[0];
let specifier = parts[1];


// Handle the packages
utils.getLernaPaths().forEach(pkgPath => {
  handlePackage(pkgPath);
});
handlePackage(path.resolve('.'));
utils.run('yarn');


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
    if (name in deps) {
      deps[name] = specifier;
    }
  }

  // Write the file back to disk.
  utils.writePackageData(packagePath, data);
}
