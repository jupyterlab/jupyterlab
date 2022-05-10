/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
// uncomment to time script
// var start = new Date();

const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const childProcess = require('child_process');

function ensurePackage(p) {
  const basePath = path.join(path.resolve('.'), p);

  // Make sure that buildutils is built and current
  let current = true;
  if (fs.existsSync(path.join(basePath, 'lib'))) {
    const srcFiles = glob.sync(path.join(basePath, 'src', '*'));
    const libFiles = glob.sync(path.join(basePath, 'lib', '*'));
    srcFiles.forEach(function (srcPath) {
      // bail early if already not current
      if (!current) {
        return;
      }

      if (srcPath.endsWith('.d.ts')) {
        // bail if this is a src declarations file
        return;
      }

      const name = path.basename(srcPath);
      const ext = path.extname(name);
      if (ext !== '.ts') {
        current = false;
        return;
      }

      const libPath = path.join(basePath, 'lib', name.replace('.ts', '.js'));
      if (libFiles.indexOf(libPath) === -1) {
        current = false;
        return;
      }
      const srcTime = fs.statSync(srcPath).mtime;
      const libTime = fs.statSync(libPath).mtime;
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
    childProcess.execSync('npm run clean', {
      stdio: [0, 1, 2],
      cwd: path.resolve('./' + p)
    });
    childProcess.execSync('npm run build', {
      stdio: [0, 1, 2],
      cwd: path.resolve('./' + p)
    });
  }
}

ensurePackage('buildutils');
ensurePackage('builder');

// uncomment to time script
// var end = new Date() - start;
// console.info('Execution time: %dms', end);
