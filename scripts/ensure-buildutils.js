/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
// uncomment to time script
// var start = new Date();

var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var childProcess = require('child_process');

var basePath = path.join(path.resolve('.'), 'buildutils');

// Make sure that buildutils is built and current
var current = true;
if (fs.existsSync(path.join(basePath, 'lib'))) {
  var srcFiles = glob.sync(path.join(basePath, 'src', '*'));
  var libFiles = glob.sync(path.join(basePath, 'lib', '*'));
  srcFiles.forEach(function(srcPath) {
    // bail early if already not current
    if (!current) {
      return;
    }

    if (srcPath.endsWith('.d.ts')) {
      // bail if this is a src declarations file
      return;
    }

    var name = path.basename(srcPath);
    var ext = path.extname(name);
    if (ext !== '.ts') {
      current = false;
      return;
    }

    var libPath = path.join(basePath, 'lib', name.replace('.ts', '.js'));
    if (libFiles.indexOf(libPath) === -1) {
      current = false;
      return;
    }
    var srcTime = fs.statSync(srcPath).mtime;
    var libTime = fs.statSync(libPath).mtime;
    if (libTime < srcTime) {
      current = false;
    }
  });
} else {
  current = false;
}

if (!current) {
  // This must be "npm" because it is run during `pip install -e .` before
  // jlpm is installed.
  childProcess.execSync('npm run build', {
    stdio: [0, 1, 2],
    cwd: path.resolve('./buildutils')
  });
}

// uncomment to time script
// var end = new Date() - start;
// console.info('Execution time: %dms', end);
