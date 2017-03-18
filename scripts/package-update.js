#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

// Make sure we have required command line arguments.
if (process.argv.length < 4) {
    var msg = '** Must supply a target library and separate version specifier';
    process.stderr.write(msg);
    process.exit(1);
}

// Extract the desired library target and specifier.
var target = process.argv[2];
var specifier = process.argv[3];

// Translate @latest to a concrete version.
if (specifier === '@latest') {
  var cmd = 'npm view ' + target + ' version';
  var specifier = childProcess.execSync(cmd);
  specifier = '^' + String(specifier).trim();
}

// Read in the package.json.
var packagePath = path.join(process.cwd(), 'package.json');
var package = require(packagePath);
process.stdout.write(package.name + '\n');


// Update dependencies as appropriate.
if (target in package['dependencies']) {
  package['dependencies'][target] = specifier;
} else if (target in package['devDependencies']) {
  package['devDependencies'][target] = specifier;
}


// Write the file back to disk.
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
