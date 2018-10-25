#!/usr/bin/env node
/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';
import packageJson from 'package-json';

import commander from 'commander';
import semver from 'semver';

let versionCache = new Map();
const tags = /^([~^]?)([\w.]*)$/;

async function getVersion(pkg: string, specifier: string) {
  let key = JSON.stringify([pkg, specifier]);
  if (versionCache.has(key)) {
    return versionCache.get(key);
  }
  if (semver.validRange(specifier) === null) {
    // We have a tag, with possibly a range specifier, such as ^latest
    let match = specifier.match(tags);
    if (match === null) {
      throw Error(`Invalid version specifier: ${specifier}`);
    }

    // Look up the actual version corresponding to the tag
    let { version } = await packageJson(pkg, { version: match[2] });
    specifier = match[1] + version;
  }
  versionCache.set(key, specifier);
  return specifier;
}

/**
 * A very simple subset comparator
 *
 * @returns true if we can determine if range1 is a subset of range2, otherwise false
 *
 * #### Notes
 * This will not be able to determine if range1 is a subset of range2 in many cases.
 */
function subset(range1: string, range2: string): boolean {
  try {
    const [, r1, version1] = range1.match(tags);
    const [, r2] = range2.match(tags);
    return (
      ['', '~', '^'].indexOf(r1) >= 0 &&
      r1 === r2 &&
      semver.valid(version1) &&
      semver.satisfies(version1, range2)
    );
  } catch (e) {
    return false;
  }
}

async function handleDependency(
  dependencies: { [key: string]: string },
  dep: string,
  specifier: string,
  minimal: boolean
): Promise<{ updated: boolean; log: string[] }> {
  let log = [];
  let updated = false;
  let newRange = await getVersion(dep, specifier);
  let oldRange = dependencies[dep];
  if (minimal && subset(newRange, oldRange)) {
    log.push(`SKIPPING ${dep} ${oldRange} -> ${newRange}`);
  } else {
    log.push(`${dep} ${oldRange} -> ${newRange}`);
    dependencies[dep] = newRange;
    updated = true;
  }
  return { updated, log };
}

/**
 * Handle an individual package on the path - update the dependency.
 */
async function handlePackage(
  name: string | RegExp,
  specifier: string,
  packagePath: string,
  dryRun = false,
  minimal = false
) {
  let fileUpdated = false;
  let fileLog: string[] = [];

  // Read in the package.json.
  packagePath = path.join(packagePath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }

  // Update dependencies as appropriate.
  for (let dtype of ['dependencies', 'devDependencies']) {
    let deps = data[dtype] || {};
    if (typeof name === 'string') {
      let dep = name;
      if (dep in deps) {
        let { updated, log } = await handleDependency(
          deps,
          dep,
          specifier,
          minimal
        );
        if (updated) {
          fileUpdated = true;
        }
        fileLog.push(...log);
      }
    } else {
      let keys = Object.keys(deps);
      keys.sort();
      for (let dep of keys) {
        if (dep.match(name)) {
          let { updated, log } = await handleDependency(
            deps,
            dep,
            specifier,
            minimal
          );
          if (updated) {
            fileUpdated = true;
          }
          fileLog.push(...log);
        }
      }
    }
  }

  if (fileLog.length > 0) {
    console.log(packagePath);
    console.log(fileLog.join('\n'));
    console.log();
  }

  // Write the file back to disk.
  if (!dryRun && fileUpdated) {
    utils.writePackageData(packagePath, data);
  }
}

commander
  .description('Update dependency versions')
  .usage('[options] <package> [versionspec], versionspec defaults to ^latest')
  .option('--dry-run', 'Do not perform actions, just print output')
  .option('--regex', 'Package is a regular expression')
  .option('--lerna', 'Update dependencies in all lerna packages')
  .option('--path <path>', 'Path to package or monorepo to update')
  .option('--minimal', 'only update if the change is substantial')
  .arguments('<package> [versionspec]')
  .action(
    async (name: string | RegExp, version: string = '^latest', args: any) => {
      let basePath = path.resolve(args.path || '.');
      let pkg = args.regex ? new RegExp(name) : name;

      if (args.lerna) {
        let paths = utils.getLernaPaths(basePath).sort();

        // We use a loop instead of Promise.all so that the output is in
        // alphabetical order.
        for (let pkgPath of paths) {
          await handlePackage(pkg, version, pkgPath, args.dryRun, args.minimal);
        }
      }
      await handlePackage(pkg, version, basePath, args.dryRun, args.minimal);
    }
  );

commander.on('--help', function() {
  console.log(`
Examples
--------

  Update the package 'webpack' to a specific version range:

      update-dependency webpack ^4.0.0

  Update all packages to the latest version, with a caret.
  Only update if the update is substantial:

      update-dependency --minimal --regex '.*' ^latest

  Print the log of the above without actually making any changes.

  update-dependency --dry-run --minimal --regex '.*' ^latest

  Update all packages starting with '@jupyterlab/' to the version
  the 'latest' tag currently points to, with a caret range:

      update-dependency --regex '^@jupyterlab/' ^latest

  Update all packages starting with '@jupyterlab/' in all lerna
  workspaces and the root package.json to whatever version the 'next'
  tag for each package currently points to (with a caret tag).
  Update the version range only if the change is substantial.

      update-dependency --lerna --regex --minimal '^@jupyterlab/' ^next
`);
});

commander.parse(process.argv);

// If no arguments supplied
if (!process.argv.slice(2).length) {
  commander.outputHelp();
  process.exit(1);
}
