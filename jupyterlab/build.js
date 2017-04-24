// Populate the git description and version of the package.json.
var childProcess = require('child_process');
var fs = require('fs-extra');
var package_data = require('./package.json');


// Get the git description.
try {
  var notice = childProcess.execSync('git describe', { encoding: 'utf8' });
} catch (e) {
  var notice = 'unknown';
}


// Get the python package version.
var cwd = process.cwd();
process.chdir('..');
try {
  var version = childProcess.execSync('python setup.py --version', { encoding: 'utf8' });
} catch (e) {
  var version = 'unknown';
}
process.chdir(cwd);


package_data.jupyterlab.version = version.trim();
package_data.jupyterlab.gitDescription = notice.trim();

var pkg = JSON.stringify(package_data, null, 2);
fs.writeFileSync('./package.json',  pkg + '\n');
