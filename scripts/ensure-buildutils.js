/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');


if (!fs.existsSync(path.join('buildutils', 'lib'))) {
  childProcess.execSync('npm run build:utils',
    { 'stdio': [0, 1, 2] }
  );
}
