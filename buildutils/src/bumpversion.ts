/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as program from 'commander';
import * as utils from './utils';

// Specify the program signature.
program
  .command('bumpversion <type>')
  .option('--dry-run', 'Dry run')
  .parse(process.argv);

const v = program.args[0];

const options = ['major', 'minor', 'patch', 'release', 'build'];
if (options.indexOf(v) === -1) {
  console.error('Version type must be one of:', options);
  process.exit(1);
}

if (program['dry-run']) {
  utils.run(`bumpversion --dry-run --verbose ${v}`);
  process.exit(0);
}

// For major or minor bumps, bump all of the JS packages as well to alpha
if (v === 'major' || v === 'minor') {
  let cmd = `lerna version preminor--force - publish=* -m \"preminor version\" --no-push`;
  utils.run(cmd);
}

// Bump the version.
utils.run(`bumpversion ${v}`);

// For patch releases, skip alpha and rc
if (v === 'patch') {
  utils.run('bumpversion release');
  utils.run('bumpversion release');
}

// Update the dev_mode version
utils.run('jlpm integrity');
