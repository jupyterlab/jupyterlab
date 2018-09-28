/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Webpack all of the packages that have a theme dir.
utils.getCorePaths().forEach(pkgPath => {
  const target = path.join(pkgPath, 'package.json');
  if (!fs.existsSync(target)) {
    return;
  }
  const data = require(target);
  if (!data.jupyterlab) {
    return;
  }
  const themeDir = data.jupyterlab.themeDir;
  if (!themeDir) {
    return;
  }
  if (!data.scripts['build:webpack']) {
    return;
  }
  utils.run('jlpm run build:webpack', { cwd: pkgPath });
});
