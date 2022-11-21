/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

if (require.main === module) {
  // Make sure we have required command line arguments.
  if (process.argv.length !== 3) {
    const msg = '** Must supply a source package name\n';
    process.stderr.write(msg);
    process.exit(1);
  }
  let name = process.argv[2];
  const pkgPath = path.resolve(path.join('.', 'packages', name));
  if (!fs.existsSync(pkgPath)) {
    console.error('Package does not exist: ', name);
    process.exit(1);
  }
  const dest = path.resolve(`./tests/test-${name}`);
  if (fs.existsSync(dest)) {
    console.error('Test package already exists:', dest);
    process.exit(1);
  }
  fs.copySync(path.resolve(path.join(__dirname, '..', 'test-template')), dest);
  const jsonPath = path.join(dest, 'package.json');
  const data = utils.readJSONFile(jsonPath);
  if (name.indexOf('@jupyterlab/') === -1) {
    // eslint-disable-next-line no-global-assign
    name = '@jupyterlab/test-' + name;
  }
  data.name = name;
  utils.writePackageData(jsonPath, data);
  fs.ensureDirSync(path.join(dest, 'src'));
}
