/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import { prepublish, publish } from './publish';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Update the version and publish')
  .option('--dry-run', 'Dry run')
  .arguments('<spec>')
  .action((spec: any, opts: any) => {
    // Get the previous version.
    const prev = utils.getVersion();

    // Make sure we have a valid version spec.
    const options = ['major', 'minor', 'release', 'build'];
    if (options.indexOf(spec) === -1) {
      throw new Error(`Version spec must be one of: ${options}`);
    }
    if (
      prev.indexOf('a') === -1 &&
      prev.indexOf('rc') === -1 &&
      spec === 'release'
    ) {
      throw new Error('Use "major" or "minor" to switch back to alpha release');
    }
    if (
      prev.indexOf('a') === -1 &&
      prev.indexOf('rc') === -1 &&
      spec === 'build'
    ) {
      throw new Error('Cannot increment a build on a final release');
    }

    // Ensure bump2version is installed (active fork of bumpversion)
    utils.run('python -m pip install bump2version');

    // Handle dry runs.
    if (opts.dryRun) {
      utils.run(`bumpversion --dry-run --verbose ${spec}`);
      return;
    }

    prepublish();

    // Bump the version.
    utils.run(`bumpversion ${spec}`);

    // Determine the version spec to use for lerna.
    let lernaVersion = 'preminor';
    if (spec === 'build') {
      lernaVersion = 'prerelease';
      // a -> rc
    } else if (spec === 'release' && prev.indexOf('a') !== -1) {
      lernaVersion = 'prerelease --pre-id=rc';
      // rc -> final
    } else if (spec === 'release' && prev.indexOf('rc') !== -1) {
      lernaVersion = 'patch';
    }
    let cmd = `lerna version -m \"New version\" --no-push ${lernaVersion}`;
    utils.run(cmd);

    // Our work is done if this is a major or minor bump.
    if (spec in ['major', 'minor']) {
      return;
    }

    publish();
  });

commander.parse(process.argv);
