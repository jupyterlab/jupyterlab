/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as childProcess from 'child_process';
import * as utils from './utils';

// Handle the packages
utils.getLernaPaths().forEach(pkgPath => {
  handlePackage(pkgPath);
});
handlePackage(path.resolve('.'));

/**
 * Handle an individual package on the path - update the dependency.
 */
function handlePackage(packagePath: string): void {
  let cmd: string;

  // Read in the package.json.
  packagePath = path.join(packagePath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }

  if (data.private) {
    return;
  }

  const pkg = data.name;

  cmd = `npm view ${pkg} versions --json`;
  const versions: string[] = JSON.parse(
    String(childProcess.execSync(cmd)).trim()
  );

  // Find latest stable
  versions.reverse();
  let prerelease = versions.find(v => !!v.match(/-\d$/));
  let stable = versions.find(v => !v.match(/-\d$/));

  // Make sure the prerelease we found is *after* the stable release
  if (
    prerelease &&
    stable &&
    versions.indexOf(prerelease) > versions.indexOf(stable)
  ) {
    prerelease = undefined;
  }

  cmd = `npm dist-tag list ${pkg}`;
  let tags = String(childProcess.execSync(cmd))
    .trim()
    .split('\n');

  console.log();
  console.log(pkg, stable, prerelease, tags);

  let stableCmd: string;
  let prereleaseCmd: string;

  if (stable) {
    stableCmd = `npm dist-tag add ${pkg}@${stable} latest`;
  } else {
    stableCmd = `npm dist-tag rm ${pkg} latest`;
  }

  if (prerelease) {
    prereleaseCmd = `npm dist-tag add ${pkg}@${prerelease} next`;
  } else {
    prereleaseCmd = `npm dist-tag rm ${pkg} next`;
  }

  console.log(stableCmd);
  console.log(prereleaseCmd);
}
