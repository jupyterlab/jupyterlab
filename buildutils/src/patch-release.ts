/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as utils from './utils';
import { publish, prepublish } from './publish';

prepublish();

// Version the desired packages
const pkgs = process.argv.slice(2).join(',');
if (pkgs) {
  const cmd = `lerna version patch -m \"New version\" --force-publish=${pkgs} --no-push`;
  utils.run(cmd);
}

// Patch the python version
// Ensure bump2version is installed (active fork of bumpversion)
utils.run('python -m pip install bump2version');
utils.run('bumpversion patch'); // switches to alpha
utils.run('bumpversion release'); // switches to rc
utils.run('bumpversion release'); // switches to final.

// Publish the packages.
publish();
