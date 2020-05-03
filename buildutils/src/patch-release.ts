/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Create a patch release')
  .option('--force', 'Force the upgrade')
  .action((options: any) => {
    // Make sure we can patch release.
    const pyVersion = utils.getPythonVersion();
    if (
      pyVersion.includes('a') ||
      pyVersion.includes('b') ||
      pyVersion.includes('rc')
    ) {
      throw new Error('Can only make a patch release from a final version');
    }

    // Run pre-bump actions.
    utils.prebump();

    // Version the changed
    let cmd = `lerna version patch -m \"New version\" --no-push`;
    if (options.force) {
      cmd += ' --yes';
    }
    const oldVersion = utils.run(
      'git rev-parse HEAD',
      {
        stdio: 'pipe',
        encoding: 'utf8'
      },
      true
    );
    utils.run(cmd);
    const newVersion = utils.run(
      'git rev-parse HEAD',
      {
        stdio: 'pipe',
        encoding: 'utf8'
      },
      true
    );
    if (oldVersion === newVersion) {
      console.debug('aborting');
      // lerna didn't version anything, so we assume the user aborted
      throw new Error('Lerna aborted');
    }

    // Patch the python version
    utils.run('bumpversion patch'); // switches to alpha
    utils.run('bumpversion release --allow-dirty'); // switches to beta
    utils.run('bumpversion release --allow-dirty'); // switches to rc.
    utils.run('bumpversion release --allow-dirty'); // switches to final.

    // Run post-bump actions.
    utils.postbump();
  });

commander.parse(process.argv);
