var childProcess = require('child_process');
var fs = require('fs');

// Clean all of the example folders.
dirs = fs.readdirSync('examples');

for (var i = 0; i < dirs.length; i++) {
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('npm run clean', { stdio: [0, 1, 2] });
  process.chdir('../..');
}
