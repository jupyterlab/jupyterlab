/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { program as commander } from 'commander';
import type { ReleaseType } from 'semver';
import { bumpWorkspaceVersions } from './bump-workspaces';
import * as utils from './utils';

interface IBumpVersionOptions {
  dryRun?: boolean;
  skipCommit?: boolean;
}

// Specify the program signature.
commander
  .description('Update the version and publish')
  .option('--dry-run', 'Dry run')
  .option('--skip-commit', 'Whether to skip commit changes')
  .arguments('<spec>')
  .action((spec: string, opts: IBumpVersionOptions) => {
    utils.exitOnUncaughtException();

    // Get the previous version.
    const prev = utils.getPythonVersion();
    const isFinal = /\d+\.\d+\.\d+$/.test(prev);

    // Whether to commit after bumping
    const commit = opts.skipCommit !== true;

    // for "next", determine whether to use "patch" or "build"
    if (spec == 'next') {
      spec = isFinal ? 'patch' : 'build';
    }

    // For patch, defer to `patch:release` command
    if (spec === 'patch') {
      let cmd = 'jlpm patch:release';
      if (opts.skipCommit) {
        cmd += ' --skip-commit';
      }
      utils.run(cmd);
      process.exit(0);
    }

    // Make sure we have a valid version spec.
    const options = ['major', 'minor', 'release', 'build'];
    if (options.indexOf(spec) === -1) {
      throw new Error(`Version spec must be one of: ${options}`);
    }
    if (isFinal && spec === 'release') {
      throw new Error('Use "major" or "minor" to switch back to alpha release');
    }
    if (isFinal && spec === 'build') {
      throw new Error('Cannot increment a build on a final release');
    }

    // Run pre-bump script.
    utils.prebump();

    // Handle dry runs.
    if (opts.dryRun) {
      utils.run(
        `bump-my-version bump --allow-dirty --dry-run --verbose ${spec}`
      );
      return;
    }

    // Determine the version increment of the JS packages.
    let increment: ReleaseType = 'preminor';
    let preid: string | undefined = 'alpha';
    if (spec === 'build') {
      increment = 'prerelease';
      preid = undefined;
      // a -> b
    } else if (spec === 'release' && prev.indexOf('a') !== -1) {
      increment = 'prerelease';
      preid = 'beta';
      // b -> rc
    } else if (spec === 'release' && prev.indexOf('b') !== -1) {
      increment = 'prerelease';
      preid = 'rc';
      // rc -> final
    } else if (spec === 'release' && prev.indexOf('rc') !== -1) {
      increment = 'patch';
    }

    // For a major release, we bump 10 minor versions so that we do
    // not conflict with versions during minor releases of the top
    // level package.
    const count = spec === 'major' ? 10 : 1;
    for (let i = 0; i < count; i++) {
      bumpWorkspaceVersions(increment, { preid });
    }

    // Bump the version.
    utils.run(`bump-my-version bump --allow-dirty ${spec}`);

    // Run the post-bump script.
    utils.postbump(commit);
  });

commander.parse(process.argv);
