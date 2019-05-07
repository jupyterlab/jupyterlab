/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as utils from './utils';

// Make sure we start in a clean git state.
if (utils.checkStatus('git diff --quiet') !== 0) {
  throw new Error('Must be in a clean git state');
}

// Make sure we are logged in.
if (utils.checkStatus('npm whomai') !== 0) {
  throw new Error('Must be logged into npm');
}

utils.run('npm run clean:slate');
utils.run('jlpm run build:packages');
utils.run('jlpm integrity');
