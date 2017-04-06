var fs = require('fs-extra');
var childProcess = require('child_process');
var path = require('path');

childProcess.execSync('npm dedupe', { cwd: path.resolve('./build') });
fs.copySync('./node_modules', './build/node_modules', { dereference: true });
childProcess.execSync('npm run build', { cwd: path.resolve('./build') });
