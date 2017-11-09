/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Ensure package integrity.
utils.run('npm run integrity');

// Change to the jupyterlab dir.
process.chdir(path.join('.', 'jupyterlab'));

// Run a production build with Typescript source maps.
utils.run('npm run build:prod');

// Update the package.app.json file.
let data = utils.readJSONFile('./package.json');
data['scripts']['build'] = 'webpack';
data['scripts']['watch'] = 'webpack --watch';
data['scripts']['build:prod'] = "webpack --define process.env.NODE_ENV=\"'production'\"";
data['jupyterlab']['outputDir'] = '..';
data['jupyterlab']['linkedPackages'] = {};
utils.ensurePackageData(data, './package.app.json');

// Update our app index file.
fs.copySync('./index.js', './index.app.js');

// Add  the release metadata.
let releaseData: any = { version: data.jupyterlab.version };
let text = JSON.stringify(releaseData, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
