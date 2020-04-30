/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Publish the JS packages and prep the Python package')
  .option(
    '--skip-build',
    'Skip the clean and build step (if there was a network error during a JS publish'
  )
  .action(async (options: any) => {
    // Make sure we are logged in.
    if (utils.checkStatus('npm whoami') !== 0) {
      console.error('Please run `npm login`');
    }
    const distDir = './dist';

    // Optionally clean and build the python packages.
    if (!options.skipBuild) {
      // Ensure a clean state.
      utils.run('npm run clean:slate');
    } else {
      // Still clean the dist directory.
      if (fs.existsSync(distDir)) {
        fs.removeSync(distDir);
      }
    }

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

    // Update core mode.  This cannot be done until the JS packages are
    // released.
    utils.run('node buildutils/lib/update-core-mode.js');

    // Make the Python release.
    utils.run('python setup.py sdist');
    utils.run('python setup.py bdist_wheel');
    utils.run('python -m pip install -U twine');
    utils.run('twine check dist/*');

    const files = fs.readdirSync(distDir);
    const hashes = new Map<string, string>();
    files.forEach(file => {
      const shasum = crypto.createHash('sha256');
      const hash = shasum.update(fs.readFileSync(path.join(distDir, file)));
      hashes.set(file, hash.digest('hex'));
    });

    const hashString = Array.from(hashes.entries())
      .map(entry => `${entry[0]}: ${entry[1]}`)
      .join('" -m "');

    // Make the commit and the tag.
    utils.run(
      `git commit -am "Publish ${curr}" -m "SHA256 hashes:" -m "${hashString}"`
    );
    utils.run(`git tag v${curr}`);

    // Prompt the user to finalize.
    console.debug('*'.repeat(40));
    console.debug('*'.repeat(40));
    console.debug('Ready to publish!');
    console.debug('Run these command when ready:');
    console.debug('twine upload dist/*');
    console.debug('git push origin <BRANCH> --tags');

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
