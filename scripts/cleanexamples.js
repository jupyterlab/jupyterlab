var childProcess = require('child_process');
var fs = require('fs');

childProcess.execSync('rimraf examples/node_modules', { stdio: 'inherit' });

// Clean all of the example folders.
dirs = fs.readdirSync('examples');

for (var i = 0; i < dirs.length; i++) {
  if (dirs[i].indexOf('.') !== -1) {
    continue;
  }
  var cmd = 'rimraf examples/' + dirs[i] + '/build';
  childProcess.execSync(cmd, { stdio: [0, 1, 2] });
}
