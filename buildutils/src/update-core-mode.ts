/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Ensure the repo is in a stable state.
utils.run('jlpm run build:utils');
utils.run('jlpm integrity');

// Get the dev mode package.json file.
let data = utils.readJSONFile('./dev_mode/package.json');

// Update the values that need to change and write to staging.
data['scripts']['build'] = 'webpack';
data['scripts']['watch'] = 'webpack --watch';
data['scripts']['build:prod'] = "webpack --define process.env.NODE_ENV=\"'production'\"";
data['jupyterlab']['outputDir'] = '..';
data['jupyterlab']['staticDir'] = '../static';
data['jupyterlab']['linkedPackages'] = {};

let staging = './jupyterlab/staging';
utils.writePackageData(path.join(staging, 'package.json'), data);

// Update our staging files.
fs.copySync('./dev_mode/index.js', './jupyterlab/staging/index.js');
fs.copySync('./dev_mode/webpack.config.js',
            './jupyterlab/staging/webpack.config.js');
fs.copySync('./dev_mode/templates', './jupyterlab/staging/templates');


// Create a new yarn.lock file to ensure it is correct.
fs.removeSync(path.join(staging, 'yarn.lock'));
utils.run('jlpm', { cwd: staging });


// Build the core assets.
utils.run('jlpm run build:prod', { cwd: staging });
