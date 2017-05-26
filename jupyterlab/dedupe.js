// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var childProcess = require('child_process');
var required = 3;
var version = childProcess.execSync('npm --version', { encoding: 'utf8' });

if (parseInt(version[0]) < required) {
  childProcess.execSync('npm dedupe', { stdio: [0, 1, 2] });
}
