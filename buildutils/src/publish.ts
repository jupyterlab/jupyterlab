/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as utils from './utils';

/**
 * Publish
 */
export function publish() {
  // Bail if on azure.
  if (process.env.AGENT_WORKFOLDER) {
    return;
  }

  const curr = utils.getVersion();

  // Publish JS to the appropriate tag.
  if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
    utils.run('lerna publish from-package -m "Publish"');
  } else {
    utils.run('lerna publish from-package --npm-tag=next -m "Publish"');
  }

  // Update the core mode.
  utils.run('node buildutils/lib/update-core-mode.js');

  // Create a git tag and commit.
  utils.run(`git tag v${curr}`);
  utils.run(`git commit -am "Publish ${curr}"`);

  // Make the Python release.
  utils.run('rm -rf dist build');
  utils.run('python setup.py sdist');
  utils.run('python setup.py bdist_wheel --universal');
  utils.run('python -m pip install twine');
  utils.run('twine upload dist/*');

  console.log('\n**************');
  console.log('Publish complete!  Push commits and tags');
}

/**
 * Prepublish.
 */
export function prepublish() {
  // Bail if on azure.
  if (process.env.AGENT_WORKFOLDER) {
    return;
  }

  // Make sure we start in a clean git state.
  if (utils.checkStatus('git diff --quiet') !== 0) {
    throw new Error('Must be in a clean git state');
  }

  // Make sure we are logged in.
  if (utils.checkStatus('npm whomai') !== 0) {
    throw new Error('Must be logged into npm');
  }

  utils.run('npm run clean:slate');
}
