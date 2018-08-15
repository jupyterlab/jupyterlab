/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as utils from './utils';

utils.run('jlpm run clean:slate');
utils.run('jlpm run build:packages');
utils.run('jlpm run build:themes');

// If we are on the main branch, make sure all of the local packages
// are up to date with npm.
let branch = utils.run('git rev-parse --abbrev-ref HEAD', {
  stdio: ['ignore', 'pipe', 'ignore']
});
if (branch === 'master') {
  utils.run('jlpm run update:local');
}

utils.run('jlpm integrity');
