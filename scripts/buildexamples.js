var childProcess = require('child_process');
var fs = require('fs');

// Build all of the example folders.
dirs = fs.readdirSync('examples');

for (var i = 0; i < dirs.length; i++) {
  process.chdir('examples/' + dirs[i]);

  childProcess.exec('npm run update && npm run build', function (error, stdout, stderr) {
    if (error) {
      console.log(error.stack);
      console.log('Error code: ' + error.code);
      console.log('Signal received: ' + error.signal);
      console.log('Child Process STDERR: ' + stderr);
     }
     console.log('Child Process STDOUT: ' + stdout);
  });

  process.chdir('../..');
}
