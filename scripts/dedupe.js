// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var childProcess = require('child_process');
var semver = require('semver');
var required = '3.0.0';
var version = childProcess.execSync('npm --version', { encoding: 'utf8' });

if (semver.lt(version, required)) {
  childProcess.execSync('npm dedupe', { stdio: [0, 1, 2] });
}
