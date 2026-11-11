/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { program as commander } from 'commander';
import { bumpWorkspaceVersions } from './bump-workspaces';
import * as utils from './utils';

interface IPatchReleaseOptions {
  skipCommit?: boolean;
}

// Specify the program signature.
commander
  .description('Create a patch release')
  .option('--skip-commit', 'Whether to skip commit changes')
  .action((options: IPatchReleaseOptions) => {
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

    // Patch the JS packages.
    bumpWorkspaceVersions('patch');

    // Patch the python version
    utils.run('bump-my-version bump --allow-dirty patch'); // switches to alpha
    utils.run('bump-my-version bump --allow-dirty release'); // switches to beta
    utils.run('bump-my-version bump --allow-dirty release'); // switches to rc.
    utils.run('bump-my-version bump --allow-dirty release'); // switches to final.

    // Run post-bump actions.
    const commit = options.skipCommit !== true;
    utils.postbump(commit);
  });

commander.parse(process.argv);
