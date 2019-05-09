/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as utils from './utils';

// Make sure we can patch release.
const pyVersion = utils.getPythonVersion();
if (pyVersion.includes('a') || pyVersion.includes('rc')) {
  throw new Error('Can only make a patch release from a final version');
}

// Run pre-bump actions.
utils.prebump();

// Version the desired packages
const pkgs = process.argv.slice(2).join(',');
if (pkgs) {
  const cmd = `lerna version patch -m \"New version\" --force-publish=${pkgs} --no-push`;
  utils.run(cmd);
}

// Patch the python version
utils.run('bumpversion patch'); // switches to alpha
utils.run('bumpversion release --allow-dirty'); // switches to rc
utils.run('bumpversion release --allow-dirty'); // switches to final.

// Run post-bump actions.
utils.postbump();
