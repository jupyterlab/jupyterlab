/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');

if (!fs.existsSync(path.join('buildutils', 'lib'))) {
  // This must be "npm" because it is run during `pip install -e .` before
  // jlpm is installed.
  childProcess.execSync('npm run build', {
    stdio: [0, 1, 2],
    cwd: path.resolve('./buildutils')
  });
}
