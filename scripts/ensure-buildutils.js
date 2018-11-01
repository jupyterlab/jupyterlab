/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var childProcess = require('child_process');

// Make sure that buildutils is built and current
var current = true;
if (fs.existsSync(path.join('buildutils', 'lib'))) {
  var srcFiles = glob.sync(path.join('buildutils', 'src', '*'));
  var libFiles = glob.sync(path.join('buildutils', 'lib', '*'));
  srcFiles.forEach(function(srcPath) {
    // Bail early if already not current
    if (!current) {
      return;
    }
    var name = path.basename(srcPath);
    var ext = path.extname(name);
    if (ext !== 'js') {
      return;
    }
    var libPath = path.join('buildutils', 'lib', name.replace('.ts', '.js'));
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
