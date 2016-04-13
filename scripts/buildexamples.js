var childProcess = require('child_process');
var fs = require('fs');

process.chdir('examples');
childProcess.execSync('npm install', { stdio: 'inherit' });
childProcess.execSync('npm run update', { stdio: 'inherit' });
process.chdir('..');

// Build all of the example folders.
dirs = fs.readdirSync('examples');

var cmd;
for (var i = 0; i < dirs.length; i++) {
  if (dirs[i].indexOf('.') !== -1) {
    continue;
  }
  if (dirs[i].indexOf('node_modules') !== -1) {
    continue;
  }
  console.log('Building: ' + dirs[i] + '...');
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('npm run build', { stdio: 'inherit' });
  process.chdir('../..');
}
