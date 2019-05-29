/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import semver from 'semver';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Bump the major version of JS package(s)')
  .arguments('<package> [others...]')
  .option('--force', 'Force the upgrade')
  .action((pkg: string, others: Array<string>, options: any) => {
    others.push(pkg);
    const toBump: string[] = [];
    others.forEach(pkg => {
      const version = utils.getJSVersion(pkg);
      if (semver.minor(version) === 0 && semver.prerelease(version)) {
        console.warn(`${pkg} has already been bumped`);
      } else {
        toBump.push(pkg);
      }
    });
    const pyVersion = utils.getPythonVersion();
    let preId = '';
    if (pyVersion.includes('a')) {
      preId = 'alpha';
    } else if (pyVersion.includes('rc')) {
      preId = 'rc';
    } else {
      throw new Error(
        'Cannot bump JS packages until we switch to prerelease mode'
      );
    }
    const pkgs = toBump.join(',');
    let cmd = `lerna version premajor --preid=${preId} --force-publish=${pkgs} --no-push`;
    if (options.force) {
      cmd += ' --yes';
    }
    utils.run(cmd);
  });

commander.parse(process.argv);
