/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Create a patch release with optional patch JS releases')
  .arguments('[pkgs...]')
  .option('--force', 'Force the upgrade')
  .action((pkgNames: Array<string>, options: any) => {
    // Make sure we can patch release.
    const pyVersion = utils.getPythonVersion();
    if (pyVersion.includes('a') || pyVersion.includes('rc')) {
      throw new Error('Can only make a patch release from a final version');
    }

    // Run pre-bump actions.
    utils.prebump();

    // Version the desired packages
    const pkgs = pkgNames.join(',');
    if (pkgs) {
      let cmd = `lerna version patch -m \"New version\" --force-publish=${pkgs} --no-push`;
      if (options.force) {
        cmd += ' --yes';
      }
      let oldVersion = utils.run(
        'git rev-parse HEAD',
        {
          stdio: 'pipe',
          encoding: 'utf8'
        },
        true
      );
      utils.run(cmd);
      let newVersion = utils.run(
        'git rev-parse HEAD',
        {
          stdio: 'pipe',
          encoding: 'utf8'
        },
        true
      );
      if (oldVersion === newVersion) {
        console.log('aborting');
        // lerna didn't version anything, so we assume the user aborted
        throw new Error('Lerna aborted');
      }
    }

    // Patch the python version
    utils.run('bumpversion patch'); // switches to alpha
    utils.run('bumpversion release --allow-dirty'); // switches to rc
    utils.run('bumpversion release --allow-dirty'); // switches to final.

    // Run post-bump actions.
    utils.postbump();
  });

commander.parse(process.argv);
