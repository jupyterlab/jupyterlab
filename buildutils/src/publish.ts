/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as path from 'path';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Publish the JS packages')
  .option(
    '--skip-build',
    'Skip the clean and build step (if there was a network error during a JS publish'
  )
  .option('--skip-publish', 'Skip publish and only handle tags')
  .option('--skip-tags', 'publish assets but do not handle tags')
  .option('--yes', 'Publish without confirmation')
  .option('--dry-run', 'Do not actually push any assets')
  .action(async (options: any) => {
    if (!options.skipPublish) {
      if (!options.skipBuild) {
        utils.run('jlpm run build:packages');
      }

      if (!options.dryRun) {
        // Make sure we are logged in.
        if (utils.checkStatus('npm whoami') !== 0) {
          console.error('Please run `npm login`');
          process.exit(1);
        }
      }

      // Ensure a clean git environment
      try {
        utils.run('git commit -am "bump version"');
      } catch (e) {
        // do nothing
      }

      // Publish JS to the appropriate tag.
      const curr = utils.getPythonVersion();
      let cmd = 'lerna publish from-package ';
      if (options.dryRun) {
        cmd += '--no-git-tag-version --no-push ';
      }
      if (options.yes) {
        cmd += '  --yes ';
      }
      if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
        utils.run(`${cmd} -m "Publish"`);
      } else {
        utils.run(`${cmd} --dist-tag=next -m "Publish"`);
      }
    }

    // Fix up any tagging issues.
    if (!options.skipTags && !options.dryRun) {
      const basePath = path.resolve('.');
      const paths = utils.getLernaPaths(basePath).sort();
      const cmds = await Promise.all(paths.map(handlePackage));
      cmds.forEach(cmdList => {
        cmdList.forEach(cmd => {
          if (!options.dryRun) {
            utils.run(cmd);
          } else {
            throw new Error(`Tag is out of sync: ${cmd}`);
          }
        });
      });
    }

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
