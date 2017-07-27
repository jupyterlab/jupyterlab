// Get the appropriate dependency for a package.
var childProcess = require('child_process');
var path = require('path');
var glob = require('glob');

var name = process.argv[2];


// Look in all of the packages.
var basePath = path.resolve('.');
var files = glob.sync(path.join(basePath, 'packages/*'));

for (var j = 0; j < files.length; j++) {
// Read in the package.json.
  var packagePath = path.join(files[j], 'package.json');
  try {
    var package = require(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    continue;
  }

  if (package.name === name) {
    console.log(package.version);
    process.exit(0);
  }

  var deps = package.dependencies || [];
  if (deps[name]) {
    console.log(deps[name]);
    process.exit(0);
  }
}

console.log('** Package not yet included!');

var cmd = 'npm view ' + name + ' version';
var specifier = childProcess.execSync(cmd);
console.log('^' + String(specifier).trim());
