/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';
import packageJson = require('package-json');

console.log('Looking for outdated local package versions...');
utils.getLernaPaths().map(async pkgPath => {
  const packagePath = path.join(pkgPath, 'package.json');
  let data: any;
  try {
    data = utils.readJSONFile(packagePath);
  } catch (e) {
    console.log('Skipping package ' + packagePath);
    return;
  }
  if (data.private === true) {
    return;
  }
  const releaseData = await packageJson(data.name, { version: 'next' });
  const version = releaseData.version;
  if (data.version === version) {
    return;
  }
  data.version = version;
  console.log('Updating', data.name, 'to', version);
  // Write the file back to disk.
  utils.writePackageData(packagePath, data);
});
