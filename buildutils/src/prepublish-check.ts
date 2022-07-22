/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as utils from './utils';

utils.exitOnUncaughtException();

utils.run('npm run build:packages');

utils.getLernaPaths().forEach(pkgPath => {
  const pkgData = utils.readJSONFile(path.join(pkgPath, 'package.json'));
  const name = pkgData.name;

  // Skip private packages.
  if (!pkgData.public) {
    return;
  }
  console.debug(`Checking ${name}...`);

  // Make sure each glob resolves to at least one file.
  pkgData.files.forEach((fGlob: string) => {
    const result = glob.sync(fGlob);
    if (result.length === 0) {
      throw new Error(`${name} has missing file(s) "${fGlob}"`);
    }
  });

  // Make sure there is a main and that it exists.
  const main = pkgData.main;
  if (!main) {
    throw new Error(`No "main" entry for ${name}`);
  }
  const mainPath = path.join(pkgPath, main);
  if (!fs.existsSync(mainPath)) {
    throw new Error(`"main" entry "${main}" not found for ${name}`);
  }
});
