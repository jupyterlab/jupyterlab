var childProcess = require('child_process');
var fs = require('fs');

// Build all of the example folders.
dirs = fs.readdirSync('examples');

for (var i = 0; i < dirs.length; i++) {
  console.log('Building: ' + dirs[i] + '...');
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('npm run update && npm run build', { stdio: [0, 1, 2] });
  process.chdir('../..');
}
