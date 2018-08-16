/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import * as utils from './utils';
import packageJson = require('package-json');

console.log('Looking for outdated local package versions...');
const cmd = 'python setup.py --version';
const pyversion = utils.run(cmd, { stdio: 'pipe' }, true);
let version = 'latest';
if (pyversion.indexOf('rc') !== -1 || pyversion.indexOf('a') !== -1) {
  version = 'next';
}

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
  const releaseData = await packageJson(data.name, { version });
  const npmVersion = releaseData.version;
  if (data.version === npmVersion) {
    return;
  }
  data.version = npmVersion;
  console.log('Updating', data.name, 'to', npmVersion);
  // Write the file back to disk.
  utils.writePackageData(packagePath, data);
});
