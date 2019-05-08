/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as utils from './utils';

const curr = utils.getVersion();

// Ensure a clean state.
utils.run('jlpm run clean:slate');

// Publish JS to the appropriate tag.
if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
  utils.run('lerna publish from-package -m "Publish"');
} else {
  utils.run('lerna publish from-package --npm-tag=next -m "Publish"');
}

// Make the Python release.
utils.run('python setup.py sdist');
utils.run('python setup.py bdist_wheel --universal');
utils.run('python -m pip install twine');
utils.run('twine upload dist/*');
