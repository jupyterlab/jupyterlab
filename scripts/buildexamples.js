var childProcess = require('child_process');
var fs = require('fs');

process.chdir('examples');
childProcess.execSync('npm install', { stdio: [0, 1, 2] });
childProcess.execSync('npm run update', { stdio: [0, 1, 2] });
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
  cmd = 'tsconfig -u examples/' + dirs[i] + '/src/tsconfig.json';
  childProcess.execSync(cmd, { stdio: [0, 1, 2] });
  process.chdir('examples/' + dirs[i]);
  childProcess.execSync('npm run build', { stdio: [0, 1, 2] });
  process.chdir('../..');
}
