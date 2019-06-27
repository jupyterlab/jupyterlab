/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Get the dev mode package.json file.
let data = utils.readJSONFile('./dev_mode/package.json');

// Update the values that need to change and write to staging.
data['jupyterlab']['buildDir'] = './build';
data['jupyterlab']['outputDir'] = '..';
data['jupyterlab']['staticDir'] = '../static';
data['jupyterlab']['linkedPackages'] = {};

let staging = './jupyterlab/staging';
utils.writePackageData(path.join(staging, 'package.json'), data);

// Update our staging files.
[
  'index.js',
  'webpack.config.js',
  'webpack.prod.config.js',
  'templates'
].forEach(name => {
  fs.copySync(
    path.join('.', 'dev_mode', name),
    path.join('.', 'jupyterlab', 'staging', name)
  );
});

// Create a new yarn.lock file to ensure it is correct.
fs.removeSync(path.join(staging, 'yarn.lock'));
utils.run('jlpm', { cwd: staging });
try {
  utils.run('jlpm yarn-deduplicate -s fewer --fail', { cwd: staging });
} catch {
  // re-run install if we deduped packages!
  utils.run('jlpm', { cwd: staging });
}

// Build the core assets.
utils.run('jlpm run build:prod', { cwd: staging });

// Run integrity
utils.run('jlpm integrity');
