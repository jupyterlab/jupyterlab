#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');


// Bail if there are no source files.
if (!fs.existsSync('./src')) {
  process.exit(0);
}

// Always build if there are not built files.
if (!fs.existsSync('./lib')) {
  childProcess.execSync('npm run build', { stdio: [0, 1, 2] });
  process.exit(0);
}

// Find the newest mtime in a directory.
function findNewest(baseDir) {
  var newest = 0;
  var files = fs.readdirSync(baseDir);
  for (var i = 0; i < files.length; i++) {
    var filepath = path.join(baseDir, files[i]);
    var mtime = fs.lstatSync(filepath).mtime;
    if (mtime > newest) {
      newest = mtime;
    }
  }
  return newest;
}

if (findNewest('./lib') < findNewest('./src')) {
  childProcess.execSync('npm run build', { stdio: [0, 1, 2] });
  process.exit(0);
} else {
  var name = path.basename(process.cwd());
  process.stdout.write('Skipping ' + name + '\n');
}
