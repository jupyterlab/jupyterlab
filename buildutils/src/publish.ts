/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as path from 'path';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

/**
 * Verify that a package specifier is published and available on npm.
 *
 * @param specifier The package specifier to verify.
 */
function verifyPublished(specifier: string): void {
  const cmd = `npm info ${specifier}`;
  const output = utils.run(cmd, { stdio: 'pipe' }, true);
  console.log(specifier);
  if (output.indexOf('dist-tags') === -1) {
    throw new Error(`${specifier} is not yet available`);
  }
}

/**
 * Sleep for a specified period.
 *
 * @param wait The time in milliseconds to wait.
 */
async function sleep(wait: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, wait));
}

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
    // No-op if we're in release helper dry run
    if (process.env.RH_DRY_RUN === 'true') {
      return;
    }

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

    // Make sure all current JS packages are published.
    console.log('Checking for published packages...');
    utils.getCorePaths().forEach(async pkgPath => {
      const pkgJson = path.join(pkgPath, 'package.json');
      const pkgData = utils.readJSONFile(pkgJson);
      const specifier = `${pkgData.name}@${pkgData.version}`;
      let attempt = 0;
      while (attempt < 10) {
        try {
          verifyPublished(specifier);
          break;
        } catch (e) {
          console.error(e);
          console.log('Sleeping for one minute...');
          await sleep(1 * 60 * 1000);
          attempt += 1;
        }
      }
      if (attempt == 10) {
        throw new Error(`Could not find package ${specifier}`);
      }
    });

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
