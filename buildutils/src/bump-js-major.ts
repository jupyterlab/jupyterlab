/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { program as commander } from 'commander';
import semver from 'semver';
import path from 'path';
import { bumpWorkspaceVersions } from './bump-workspaces';
import * as utils from './utils';

interface IBumpJSOptions {
  dryRun?: boolean;
}

/**
 * Get the packages that depend on a given package, recursively.
 */
export function getDeps(
  pkgName: string,
  lut: { [key: string]: { [key: string]: string } }
): Set<string> {
  const deps: Set<string> = new Set();
  for (const name in lut) {
    if (pkgName in lut[name]) {
      deps.add(name);
      const otherDeps = getDeps(name, lut);
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
  .option('--dry-run', 'Show what would be executed')
  .action((pkg: string, others: Array<string>, options: IBumpJSOptions) => {
    utils.exitOnUncaughtException();
    others.push(pkg);

    // Create a lut of the dependencies and versions of the public packages
    const lut: { [key: string]: { [key: string]: string } } = {};
    const versions: { [key: string]: string } = {};
    utils.getYarnPaths().forEach(pkgPath => {
      const data = utils.readJSONFile(path.join(pkgPath, 'package.json'));
      if (data.private !== true) {
        lut[data.name] = data.dependencies || {};
        versions[data.name] = data.version;
      }
    });

    const toBump: Set<string> = new Set();
    const ignoreBump: Set<string> = new Set();
    const maybeBump = (name: string) => {
      if (toBump.has(name) || ignoreBump.has(name)) {
        return;
      }
      const version = versions[name];
      if (!version) {
        throw new Error(`${name} is not a public workspace package`);
      }
      if (semver.minor(version) === 0 && semver.prerelease(version)) {
        console.warn(`${name} has already been bumped`);
        ignoreBump.add(name);
      } else {
        toBump.add(name);
      }
    };
    others.forEach(pkg => {
      maybeBump(`@jupyterlab/${pkg}`);
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
    if (options.dryRun) {
      console.debug('Would bump:');
      console.debug(Array.from(toBump).join('\n'));
      return;
    }
    bumpWorkspaceVersions('premajor', { preid: preId, packages: toBump });
    utils.postbump(false);
  });

commander.parse(process.argv);
