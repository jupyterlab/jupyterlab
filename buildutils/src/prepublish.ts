/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

utils.run('jlpm run clean:slate');
utils.run('jlpm run build:packages');
utils.run('jlpm run build:themes');

// If we are on the main branch, make sure all of the local packages
// are up to date with npm.
let branch = utils.run('git rev-parse --abbrev-ref HEAD 2>/dev/null');
if (branch === 'master') {
  utils.run('jlpm run update:local');
}

utils.run('jlpm integrity');
