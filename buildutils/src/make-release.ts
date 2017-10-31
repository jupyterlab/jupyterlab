/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';
import { ensureIntegrity } from './ensure-repo';

// Start from a clean slate.
utils.run('npm run clean:slate');

// Ensure integrity.
if (!ensureIntegrity()) {
    process.exit(1);
}

// Build the packages.
utils.run('npm run build:packages');

// Change to the jupyterlab dir.
process.chdir(path.join('.', 'jupyterlab'));

// Run a production build with Typescript source maps.
utils.run('jlpm run build:prod');

// Update the package.app.json file.
let data = utils.readJSONFile('./package.json');
data['scripts']['build'] = 'webpack';
data['scripts']['watch'] = 'webpack --watch';
data['scripts']['build:prod'] = "webpack --define process.env.NODE_ENV=\"'production'\"";
data['jupyterlab']['outputDir'] = '..';
data['jupyterlab']['staticDir'] = '../static';
data['jupyterlab']['linkedPackages'] = {};
utils.writePackageData('./package.app.json', data);

// Update our app index file.
fs.copySync('./index.js', './index.app.js');

// Add  the release metadata.
let releaseData: any = { version: data.jupyterlab.version };
let text = JSON.stringify(releaseData, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
