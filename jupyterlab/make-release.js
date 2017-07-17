var childProcess = require('child_process');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var sortPackageJson = require('sort-package-json');


/**
 * Update the dependencies of the package.
 */
function updateDependencies(data) {
  // Handle all of the packages.
  var basePath = path.resolve('..');
  var files = glob.sync(path.join(basePath, 'packages/*'));
  for (var j = 0; j < files.length; j++) {
    handlePackage(files[j], data);
  }
}


/**
 * Handle an individual package on the path - get its dependencies.
 */
function handlePackage(packagePath, data) {
  // Read in the package.json.
  var packagePath = path.join(packagePath, 'package.json');
  try {
    var package = require(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }

  var deps = package.dependencies || [];
  for (var dep in deps) {
    data.dependencies[dep] = deps[dep];
  }
}


// Get the current version of JupyterLab
var cwd = path.resolve('..');
var version = childProcess.execSync('python setup.py --version', { cwd: cwd });
version = version.toString().trim();

// Update our package.json files.
var data = require('./package.json');
data['jupyterlab']['version'] = version;

// Update our package.json files.
updateDependencies(data);
var text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
fs.writeFileSync('./package.json', text);

// Update the build script.
text = JSON.stringify(sortPackageJson(data), null, 2) + '\n';
data['scripts']['build'] = 'webpack'
fs.writeFileSync('./package.app.json', text);

// Update our app index file.
fs.copySync('./index.js', './index.app.js')

// Run a standard build.
childProcess.execSync('npm run build');

// Add  the release metadata.
var release_data = { version: version };
text = JSON.stringify(release_data, null, 2) + '\n';
fs.writeFileSync('./build/release_data.json', text);
