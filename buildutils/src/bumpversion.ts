/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .option('--dry-run', 'Dry run')
  .arguments('<version>')
  .action((v: any, opts: any) => {
    const options = ['major', 'minor', 'patch', 'release', 'build'];
    if (options.indexOf(v) === -1) {
      console.error('Version type must be one of:', options);
      process.exit(1);
    }

    if (opts.dryRun) {
      utils.run(`bumpversion --dry-run --verbose ${v}`);
      return;
    }

    // For major or minor bumps, bump all of the JS packages as well to alpha
    if (v === 'major' || v === 'minor') {
      let cmd = `lerna version preminor --force-publish=* -m \"Prerelease version\" --no-push`;
      utils.run(cmd);
    }

    // Bump the version.
    utils.run(`bumpversion ${v}`);

    // For patch releases, skip alpha and rc
    if (v === 'patch') {
      utils.run('bumpversion release');
      utils.run('bumpversion release');
    }
  });

commander.parse(process.argv);
