var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');

// Run a production build with Typescript source maps.
childProcess.execSync('npm run build:prod', {stdio:[0,1,2]});

// Update the package.app.json file.
var data = require('./package.json');
data['scripts']['build'] = 'webpack'
data['scripts']['watch'] = 'webpack --watch'
data['jupyterlab']['outputDir'] = '..';
data['jupyterlab']['linkedPackages'] = {};
text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
fs.writeFileSync('./package.app.json', text);

// Update our app index file.
fs.copySync('./index.js', './index.app.js');

// Add  the release metadata.
var release_data = { version: data.jupyterlab.version };
text = JSON.stringify(release_data, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
