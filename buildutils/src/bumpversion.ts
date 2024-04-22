/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { program as commander } from 'commander';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Update the version and publish')
  .option('--dry-run', 'Dry run')
  .option('--force', 'Force the upgrade')
  .option('--skip-commit', 'Whether to skip commit changes')
  .arguments('<spec>')
  .action((spec: any, opts: any) => {
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
      let cmd = 'jlpm run patch:release --all';
      if (opts.force) {
        cmd += ' --force';
      }
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
      utils.run(`bumpversion --allow-dirty --dry-run --verbose ${spec}`);
      return;
    }

    // Determine the version spec to use for lerna.
    let lernaVersion = 'preminor';
    if (spec === 'build') {
      lernaVersion = 'prerelease';
      // a -> b
    } else if (spec === 'release' && prev.indexOf('a') !== -1) {
      lernaVersion = 'prerelease --preid=beta';
      // b -> rc
    } else if (spec === 'release' && prev.indexOf('b') !== -1) {
      lernaVersion = 'prerelease --preid=rc';
      // rc -> final
    } else if (spec === 'release' && prev.indexOf('rc') !== -1) {
      lernaVersion = 'patch';
    }
    if (lernaVersion === 'preminor') {
      lernaVersion += ' --preid=alpha';
    }

    let cmd = `lerna version --no-git-tag-version --force-publish=* --no-push ${lernaVersion}`;
    if (opts.force) {
      cmd += ' --yes';
    }

    const oldVersion = utils.getJSVersion('metapackage');

    // For a major release, we bump 10 minor versions so that we do
    // not conflict with versions during minor releases of the top
    // level package.
    if (spec === 'major') {
      for (let i = 0; i < 10; i++) {
        utils.run(cmd);
      }
    } else {
      utils.run(cmd);
    }

    const newVersion = utils.getJSVersion('metapackage');
    if (spec !== 'major' && oldVersion === newVersion) {
      // lerna didn't version anything, so we assume the user aborted
      throw new Error('Lerna aborted');
    }

    // Bump the version.
    utils.run(`bumpversion --allow-dirty ${spec}`);

    // Run the post-bump script.
    utils.postbump(commit);
  });

commander.parse(process.argv);
