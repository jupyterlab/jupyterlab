/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/*
Exits with a return code of 1 if hooks are *not* disabled.
*/

var childProcess = require('child_process');

try {
  var output = childProcess.execSync(
    'git config --bool --get husky.disableHooks',
    { encoding: 'utf8' }
  );
} catch (e) {
  process.exit(1);
}

if (output.trim() !== 'true') {
  process.exit(1);
}
