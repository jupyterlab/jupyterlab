/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as path from 'path';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

async function main() {
  // Ensure a clean state.
  utils.run('jlpm run clean:slate');

  // Publish JS to the appropriate tag.
  const curr = utils.getPythonVersion();
  if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
    utils.run('lerna publish from-package -m "Publish"');
  } else {
    utils.run('lerna publish from-package --npm-tag=next -m "Publish"');
  }

  // Fix up any tagging issues.
  const basePath = path.resolve('.');
  const paths = utils.getLernaPaths(basePath).sort();
  const cmds = await Promise.all(paths.map(handlePackage));
  cmds.forEach(cmdList => {
    cmdList.forEach(cmd => {
      utils.run(cmd);
    });
  });

  // Update core mode.
  utils.run('node buildutils/lib/update-core-mode.js');

  // Make the Python release.
  utils.run('python setup.py sdist');
  utils.run('python setup.py bdist_wheel --universal');
  utils.run('python -m pip install twine');
  utils.run('twine upload dist/*');
}

void main();
