/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { program as commander } from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Create a patch release')
  .option('--force', 'Force the upgrade')
  .option('--all', 'Patch all JS packages instead of the changed ones')
  .option('--skip-commit', 'Whether to skip commit changes')
  .action((options: any) => {
    utils.exitOnUncaughtException();

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
    let cmd = `lerna version patch --no-git-tag-version --no-push`;
    if (options.all) {
      cmd += ' --force-publish=*';
    }
    if (options.force) {
      cmd += ' --yes';
    }

    const oldVersion = utils.getJSVersion('metapackage');
    utils.run(cmd);
    const newVersion = utils.getJSVersion('metapackage');

    if (oldVersion === newVersion) {
      // lerna didn't version anything, so we assume the user aborted
      throw new Error('Lerna aborted');
    }

    // Patch the python version
    utils.run('bumpversion patch --allow-dirty'); // switches to alpha
    utils.run('bumpversion release --allow-dirty'); // switches to beta
    utils.run('bumpversion release --allow-dirty'); // switches to rc.
    utils.run('bumpversion release --allow-dirty'); // switches to final.

    // Run post-bump actions.
    const commit = options.skipCommit !== true;
    utils.postbump(commit);
  });

commander.parse(process.argv);
