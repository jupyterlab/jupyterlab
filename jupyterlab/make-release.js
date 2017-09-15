var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

// Update the core.
require('./update-core');

// Get the current version of JupyterLab
var cwd = path.resolve('..');
var version = childProcess.execSync('python setup.py --version', { cwd: cwd });

// Update the package.json file.
var data = require('./package.json');
data['jupyterlab']['version'] = version.toString().trim();
text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
fs.writeFileSync('./package.json', text);

// Update the package.app.json file.
data['scripts']['build'] = 'webpack'
data['jupyterlab']['outputDir'] = '..';
text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
fs.writeFileSync('./package.app.json', text);

// Update our app index file.
fs.copySync('./index.js', './index.app.js')

// Run a standard build with Typescript source maps working.
childProcess.execSync('npm run build:prod');

// Add  the release metadata.
var release_data = { version: version };
text = JSON.stringify(release_data, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
