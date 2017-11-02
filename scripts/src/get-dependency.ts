// Get the appropriate dependency for a package.
import path = require('path');
import utils = require('./utils');
import childProcess = require('child_process');

let allDeps: string[] = [];
let allDevDeps: string[] = [];
let hatVersions: ReadonlyArray<string | RegExp> = [/@phosphor\/*/];


/**
 * Get the appropriate dependency for a given package name.
 *
 * @param name - The name of the package.
 *
 * @returns The dependency version specifier.
 */
export
function getDependency(name: string): string {
  let version = null;

  try {
    let data = require(path.join(name, 'package.json'));
    let spec = '~';
    for (let hat of hatVersions) {
      if (RegExp(hat).test(data.name)) {
        spec = '^';
      }
    }
    version = spec + data.version;
  } catch (e) {
    // ignore
  }

  utils.getCorePaths().forEach(pkgRoot => {
  // Read in the package.json.
    let packagePath = path.join(pkgRoot, 'package.json');
    let data: any;
    try {
      data = require(packagePath);
    } catch (e) {
      console.log('Skipping package ' + packagePath);
      return;
    }

    if (data.name === name) {
      version = '^' + data.version;
    }

    let deps = data.dependencies || {};
    let devDeps = data.devDependencies || {};
    if (deps[name]) {
      allDeps.push(data.name);
    }
    if (devDeps[name]) {
      allDevDeps.push(data.name);
    }
  });

  if (!version) {
    let cmd = 'npm view ' + name + ' version';
    version = '~' + String(childProcess.execSync(cmd)).trim();
  }

  return version;
}

if (require.main === module) {
  // Make sure we have required command line arguments.
  if (process.argv.length < 3) {
      let msg = '** Must supply a target library name\n';
      process.stderr.write(msg);
      process.exit(1);
  }
  let version = getDependency(process.argv[2]);
  console.log('deps: ', allDeps);
  console.log('devDeps:', allDevDeps);
  console.log('\n    ' + '"' + name + '": "' + version + '"');
}
