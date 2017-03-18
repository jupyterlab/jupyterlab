#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

if (process.argv.length < 4) {
    var msg = '** Must supply a target library and separate version specifier';
    process.stderr.write(msg);
    process.exit(1);
}

var target = process.argv[2];
var specifier = process.argv[3];

if (specifier === '@latest') {
  var cmd = 'npm view ' + target + ' version';
  var specifier = childProcess.execSync(cmd);
  specifier = '^' + String(specifier).trim();
}

var packagePath = path.join(process.cwd(), 'package.json');
var package = require(packagePath);
process.stdout.write(package.name + '\n');

if (target in package['dependencies']) {
  package['dependencies'][target] = specifier;
} else if (target in package['devDependencies']) {
  package['devDependencies'][target] = specifier;
}

fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
