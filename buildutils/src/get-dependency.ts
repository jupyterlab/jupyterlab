#!/usr/bin/env node
/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';
import packageJson from 'package-json';

let allDeps: string[] = [];
let allDevDeps: string[] = [];

/**
 * Get the appropriate dependency for a given package name.
 *
 * @param name - The name of the package.
 *
 * @returns The dependency version specifier.
 */
export async function getDependency(name: string): Promise<string> {
  let version = '';
  const versions: { [key: string]: number } = {};
  allDeps = [];
  allDevDeps = [];

  utils.getLernaPaths().forEach(pkgRoot => {
    // Read in the package.json.
    const packagePath = path.join(pkgRoot, 'package.json');
    let data: any;
    try {
      data = utils.readJSONFile(packagePath);
    } catch (e) {
      return;
    }

    if (data.name === name) {
      version = '^' + data.version;
      return;
    }

    const deps = data.dependencies || {};
    const devDeps = data.devDependencies || {};
    if (deps[name]) {
      allDeps.push(data.name);
      if (deps[name] in versions) {
        versions[deps[name]]++;
      } else {
        versions[deps[name]] = 1;
      }
    }
    if (devDeps[name]) {
      allDevDeps.push(data.name);
      if (devDeps[name] in versions) {
        versions[devDeps[name]]++;
      } else {
        versions[devDeps[name]] = 1;
      }
    }
  });

  if (version) {
    return version;
  }

  if (Object.keys(versions).length > 0) {
    // Get the most common version.
    version = Object.keys(versions).reduce((a, b) => {
      return versions[a] > versions[b] ? a : b;
    });
  } else {
    const releaseData = await packageJson(name);
    version = '~' + releaseData.version;
  }

  return Promise.resolve(version);
}

if (require.main === module) {
  // Make sure we have required command line arguments.
  if (process.argv.length < 3) {
    const msg = '** Must supply a target library name\n';
    process.stderr.write(msg);
    process.exit(1);
  }
  const name = process.argv[2];
  void getDependency(name).then(version => {
    console.debug('dependency of: ', allDeps);
    console.debug('devDependency of:', allDevDeps);
    console.debug(`\n    "${name}": "${version}"`);
  });
}
