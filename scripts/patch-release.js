#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');


// Make sure we have required command line arguments.
if (process.argv.length < 3) {
  var msg = '** Must supply a target package';
  process.stderr.write(msg);
  process.exit(1);
}

// Extract the desired package target.
var target = process.argv[2];

var packagePath = path.resolve(path.join('packages', target));

if (!fs.existsSync(packagePath)) {
  console.log('Invalid package path', packagePath);
  process.exit(1);
}

// Perform the patch operations.
console.log('Patching', target, '...');
run('npm run build:packages');
run('npm version patch', { cwd: packagePath });
run('npm publish', { cwd: packagePath});

// Extract the new package info.
var data = require(path.join(packagePath, 'package.json'));
var name = data.name;
var version = data.version;

run('npm run integrity');
run('git commit -a -m "Release ' + name + '@' + version + '"');
run('git tag ' + name + '@' + version);

console.log('\n\nFinished, make sure to push the commit and the tag.')
