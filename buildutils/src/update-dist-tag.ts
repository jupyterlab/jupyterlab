/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';
import packageJson from 'package-json';
import { program as commander } from 'commander';
import semver from 'semver';

/**
 * Handle an individual package on the path - update the dependency.
 */
export async function handlePackage(packagePath: string): Promise<string[]> {
  const cmds: string[] = [];

  // Read in the package.json.
  packagePath = path.join(packagePath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.debug('Skipping package ' + packagePath);
    return cmds;
  }

  if (data.private) {
    return cmds;
  }

  const pkg = data.name;

  const npmData = await packageJson(pkg, { allVersions: true });
  const versions = Object.keys(npmData.versions).sort(semver.rcompare);
  const tags = npmData['dist-tags'];

  // Go through the versions. The latest prerelease is 'next', the latest
  // non-prerelease should be 'stable'.
  const next = semver.prerelease(versions[0]) ? versions[0] : undefined;
  const latest = versions.find(i => !semver.prerelease(i));

  if (latest && latest !== tags.latest) {
    cmds.push(`npm dist-tag add ${pkg}@${latest} latest`);
  }

  // If next is defined, but not supposed to be, remove it. If next is supposed
  // to be defined, but is not the same as the current next, change it.
  if (!next && tags.next) {
    cmds.push(`npm dist-tag rm ${pkg} next`);
  } else if (next && next !== tags.next) {
    cmds.push(`npm dist-tag add ${pkg}@${next} next`);
  }

  return cmds;
}

function flatten(a: any[]) {
  return a.reduce((acc, val) => acc.concat(val), []);
}

commander
  .description(
    `Print out commands to update npm 'latest' and 'next' dist-tags
so that 'latest' points to the latest stable release and 'next'
points to the latest prerelease after it.`
  )
  .option('--lerna', 'Update dist-tags in all lerna packages')
  .option('--path [path]', 'Path to package or monorepo to update')
  .action(async (args: any) => {
    const basePath = path.resolve(args.path || '.');
    let cmds: string[][] = [];
    let paths: string[] = [];
    if (args.lerna) {
      paths = utils.getLernaPaths(basePath).sort();
      cmds = await Promise.all(paths.map(handlePackage));
    }
    cmds.push(await handlePackage(basePath));
    const out = flatten(cmds).join('\n');
    if (out) {
      console.debug(out);
    }
  });

if (require.main === module) {
  commander.parse(process.argv);
}
