// Get the appropriate dependency for a package.
var childProcess = require('child_process');
var path = require('path');
var glob = require('glob');

var allDeps = [];
var allDevDeps = [];


/**
 * Get the appropriate dependency for a given package name.
 */
function getDependency(name) {
  var version = null;

  try {
    version = '~' + require(path.join(name, 'package.json')).version;
  } catch (e) {
    // ignore
  }

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
      version = '^' + package.version;
    }

    var deps = package.dependencies || {};
    var devDeps = package.devDependencies || {};
    if (deps[name]) {
      allDeps.push(package.name);
    }
    if (devDeps[name]) {
      allDevDeps.push(package.name);
    }
  }

  if (!version) {
    var cmd = 'npm view ' + name + ' version';
    version = '~' + String(childProcess.execSync(cmd)).trim();
  }

  return version;
}

module.exports = getDependency;

if (require.main === module) {
  // Make sure we have required command line arguments.
  if (process.argv.length < 3) {
      var msg = '** Must supply a target library name\n';
      process.stderr.write(msg);
      process.exit(1);
  }
  var version = getDependency(process.argv[2]);
  console.log('deps: ', allDeps);
  console.log('devDeps:', allDevDeps);
  console.log('\n    ' + '"' + name + '": "' + version + '"');
}
