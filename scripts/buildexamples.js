// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var childProcess = require('child_process');
var fs = require('fs');

// Build all of the example folders.
dirs = fs.readdirSync('examples');

for (var i = 0; i < dirs.length; i++) {
  console.log('\n********');
  console.log('Building: ' + dirs[i] + '...');
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('rimraf node_modules/jupyterlab && npm install --cache-min 9999999', { stdio: [0, 1, 2] });
  process.chdir('../..');
}
console.log('\n********\nDone building examples!');
