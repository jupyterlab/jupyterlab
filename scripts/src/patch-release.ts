#!/usr/bin/env node
import fs = require('fs');
import path = require('path');
import utils = require('./utils');


// Make sure we have required command line arguments.
if (process.argv.length < 3) {
  let msg = '** Must supply a target package';
  process.stderr.write(msg);
  process.exit(1);
}

// Extract the desired package target.
let target = process.argv[2];

let packagePath = path.resolve(path.join('packages', target));

if (!fs.existsSync(packagePath)) {
  console.log('Invalid package path', packagePath);
  process.exit(1);
}

// Perform the patch operations.
console.log('Patching', target, '...');
utils.run('npm run build:packages');
utils.run('npm version patch', { cwd: packagePath });
utils.run('npm publish', { cwd: packagePath});

// Extract the new package info.
let data = require(path.join(packagePath, 'package.json'));
let name = data.name;
let version = data.version;

utils.run('npm run integrity');
utils.run('git commit -a -m "Release ' + name + '@' + version + '"');
utils.run('git tag ' + name + '@' + version);

console.log('\n\nFinished, make sure to push the commit and the tag.');
