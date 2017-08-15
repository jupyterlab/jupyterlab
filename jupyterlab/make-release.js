var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');


// Get the current version of JupyterLab
var cwd = path.resolve('..');
var version = childProcess.execSync('python setup.py --version', { cwd: cwd });
version = version.toString().trim();

// Update the package.app.json file.
var data = require('./package.json');
data['scripts']['build'] = 'webpack'
text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
fs.writeFileSync('./package.app.json', text);

// Update our app index file.
fs.copySync('./index.js', './index.app.js')

// Run a standard build.
childProcess.execSync('npm run build');

// Add  the release metadata.
var release_data = { version: version };
text = JSON.stringify(release_data, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
