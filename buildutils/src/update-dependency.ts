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
 * Handle an individual package on the path - update the dependency.
 */
async function handlePackage(
  name: string | RegExp,
  specifier: string,
  packagePath: string,
  regex = false
) {
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
      if (name in deps) {
        deps[name] = await getVersion(name, specifier);
      }
    } else {
      await Promise.all(
        Object.keys(deps).map(async dep => {
          if (dep.match(name)) {
            deps[dep] = await getVersion(dep, specifier);
          }
        })
      );
    }
  }

  // Write the file back to disk.
  utils.writePackageData(packagePath, data);
}

let run = false;

commander
  .description('Update dependency versions')
  .usage('[options] <package> [versionspec], versionspec defaults to ^latest')
  .option('--regex', 'Package is a regular expression')
  .option('--lerna', 'Update dependencies in all lerna packages')
  .option('--path [path]', 'Path to package or monorepo to update')
  .arguments('<package> [versionspec]')
  .action((name: string | RegExp, version: string = '^latest', args: any) => {
    run = true;
    let basePath = path.resolve(commander.path || '.');
    let pkg = commander.regex ? new RegExp(name) : name;

    if (commander.lerna) {
      utils.getLernaPaths(basePath).forEach(pkgPath => {
        handlePackage(pkg, version, pkgPath);
      });
    }

    handlePackage(pkg, version, basePath);
  });

commander.on('--help', function() {
  console.log(`
Examples
--------

  Update the package 'webpack' to a specific version range:

      update-dependency webpack ^4.0.0

  Update all packages to the latest version, with a caret:

      update-dependency --regex '.*' ^latest

  Update all packages starting with '@jupyterlab/' to the version
  the 'latest' tag currently points to, with a caret range:

      update-dependency --regex '^@jupyterlab/' ^latest
    
  Update all packages starting with '@jupyterlab/' in all lerna
  workspaces and the root package.json to whatever version the
  'next' tag for each package currently points to:

      update-dependency --lerna --regex '^@jupyterlab/' next
`);
});
commander.parse(process.argv);

if (!run) {
  console.error(`
  error: missing required argument 'package'
  `);
  process.exit(1);
}
