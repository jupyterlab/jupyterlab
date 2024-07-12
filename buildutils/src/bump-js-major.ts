/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { program as commander } from 'commander';
import semver from 'semver';
import path from 'path';
import * as utils from './utils';

/**
 * Get the packages that depend on a given package, recursively.
 */
export function getDeps(
  pkgName: string,
  lut: { [key: string]: { [key: string]: string } }
): Set<string> {
  const deps: Set<string> = new Set();
  for (const name in lut) {
    if ('@jupyterlab/' + pkgName in lut[name]) {
      const otherName = name.replace('@jupyterlab/', '');
      deps.add(otherName);
      const otherDeps = getDeps(otherName, lut);
      otherDeps.forEach(dep => {
        deps.add(dep);
      });
    }
  }
  return deps;
}

// Specify the program signature.
commander
  .description('Bump the major version of JS package(s)')
  .arguments('<package> [others...]')
  .option('--force', 'Force the upgrade')
  .option('--dry-run', 'Show what would be executed')
  .action((pkg: string, others: Array<string>, options: any) => {
    utils.exitOnUncaughtException();
    others.push(pkg);
    const toBump: Set<string> = new Set();
    const ignoreBump: Set<string> = new Set();
    const maybeBump = (pkg: string) => {
      if (pkg in toBump || pkg in ignoreBump) {
        return;
      }
      const version = utils.getJSVersion(pkg);
      if (semver.minor(version) === 0 && semver.prerelease(version)) {
        console.warn(`${pkg} has already been bumped`);
        ignoreBump.add(pkg);
      } else {
        toBump.add(pkg);
      }
    };
    others.forEach(pkg => {
      maybeBump(pkg);
    });

    // Create a lut of dependencies
    const lut: { [key: string]: { [key: string]: string } } = {};
    utils.getCorePaths().forEach(corePath => {
      const pkgDataPath = path.join(corePath, 'package.json');
      const data = utils.readJSONFile(pkgDataPath);
      lut[data.name] = data.dependencies || {};
    });

    // Look for dependencies of bumped packages
    toBump.forEach(val => {
      const deps = getDeps(val, lut);
      deps.forEach(dep => {
        maybeBump(dep);
      });
    });

    if (!toBump.size) {
      console.warn('No packages found to bump!');
      return;
    }

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
    const pkgs = Array.from(toBump).join(',');
    let cmd = `lerna version premajor --preid=${preId} --force-publish=${pkgs} --no-push`;
    if (options.force) {
      cmd += ' --yes';
    }

    if (options.dryRun) {
      console.debug('Would run:');
      console.debug(cmd);
      return;
    }
    utils.run(cmd);
  });

commander.parse(process.argv);
