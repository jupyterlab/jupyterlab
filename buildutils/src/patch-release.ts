/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';
import { publish, prepublish } from './publish';

prepublish();

// Extract the desired package target(s).
process.argv.slice(2).forEach(target => {
  let packagePath = path.resolve(path.join('packages', target));

  if (!fs.existsSync(packagePath)) {
    console.log('Invalid package path', packagePath);
    process.exit(1);
  }

  // Perform the patch operations.
  console.log('Patching', target, '...');

  utils.run('npm version patch', { cwd: packagePath });
  utils.run('npm publish', { cwd: packagePath });

  // Extract the new package info.
  let data = utils.readJSONFile(path.join(packagePath, 'package.json'));
  let name = data.name;
  let version = data.version;

  // Make the release commit
  utils.run('git commit -a -m "Release ' + name + '@' + version + '"');
  utils.run('git tag ' + name + '@' + version);
});

// Patch the python version
// Ensure bump2version is installed (active fork of bumpversion)
utils.run('python -m pip install bump2version');
utils.run('bumpversion patch'); // switches to alpha
utils.run('bumpversion release'); // switches to rc
utils.run('bumpversion release'); // switches to final.

// Publish the python package.
publish();
