var childProcess = require('child_process');
var fs = require('fs-extra');


fs.watch('build', { interval: 500 }, function (eventType, filename) {
  if (filename === 'bundle.js') {
    childProcess.execSync('npm run test', {stdio:[0,1,2]});
  }
});
