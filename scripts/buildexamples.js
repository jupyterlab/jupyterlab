var childProcess = require('child_process');
var fs = require('fs');

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
  console.log('\n***********\nBuilding: ' + dirs[i] + '...');
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('npm run update', { stdio: 'inherit' });
  childProcess.execSync('npm run build', { stdio: 'inherit' });
  process.chdir('../..');

}
console.log('\n********\nDone!');
