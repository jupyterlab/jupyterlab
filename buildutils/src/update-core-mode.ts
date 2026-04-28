/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { program as commander } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';
import { upgradeLock } from './update-staging-lock';

commander
  .description('Update the core mode package.json and staging assets')
  .option(
    '--skip-assets',
    'Skip the staging build - only update core.package.json metadata'
  )
  .action((options: any) => {
    updateCoreMode(options.skipAssets);
  });

commander.parse(process.argv);

function updateCoreMode(skipAssets: boolean = false): void {
  // Run integrity to update the dev_mode package.json
  utils.run('jlpm integrity');

  // Get the dev mode package.json file.
  const data = utils.readJSONFile('./dev_mode/package.json');

  // Update the values that need to change.
  data['jupyterlab']['buildDir'] = './build';
  data['jupyterlab']['outputDir'] = '..';
  data['jupyterlab']['staticDir'] = '../static';
  data['jupyterlab']['linkedPackages'] = {};

  if (skipAssets) {
    // Write directly to core.package.json without touching staging.
    const coreMeta = path.join('packages', 'core-meta', 'core.package.json');
    fs.ensureFileSync(coreMeta);
    utils.writePackageData(coreMeta, data);
    console.log(
      'Skipping staging asset build (--skip-assets specified). Core metadata updated.'
    );
    return;
  }

  const staging = './jupyterlab/staging';

  // Ensure a clean staging directory.
  const keep = ['yarn.js', '.yarnrc.yml'];
  fs.readdirSync(staging).forEach(name => {
    if (keep.indexOf(name) === -1) {
      fs.removeSync(path.join(staging, name));
    }
  });
  fs.ensureDirSync(staging);
  fs.ensureFileSync(path.join(staging, 'package.json'));

  utils.writePackageData(path.join(staging, 'package.json'), data);

  fs.copySync(
    path.join(staging, 'package.json'),
    path.join('packages', 'core-meta', 'core.package.json')
  );

  // Update our staging files.
  const notice =
    '// This file is auto-generated from the corresponding file in /dev_mode\n';

  [
    'index.js',
    'bootstrap.js',
    'publicpath.js',
    'webpack.config.js',
    'webpack.prod.config.js',
    'webpack.prod.minimize.config.js',
    'webpack.prod.release.config.js',
    'templates'
  ].forEach(name => {
    const dest = path.join('.', 'jupyterlab', 'staging', name);
    fs.copySync(path.join('.', 'dev_mode', name), dest);

    if (path.extname(name) === '.js') {
      const oldContent = fs.readFileSync(dest);
      const newContent = notice + oldContent;
      fs.writeFileSync(dest, newContent);
    }
  });

  // Copy the root yarn.lock, then update and deduplicate to prune it.
  fs.copySync(
    path.join('.', 'yarn.lock'),
    path.join('.', 'jupyterlab', 'staging', 'yarn.lock')
  );
  process.env.YARN_UNSAFE_HTTP_WHITELIST = '0.0.0.0';
  upgradeLock('@jupyterlab/*', {
    lock: path.join(staging, 'yarn.lock'),
    cwd: staging
  });
  utils.run('jlpm dlx yarn-berry-deduplicate --strategy fewerHighest', {
    cwd: staging
  });
  utils.run('jlpm', { cwd: staging });

  // Build the core assets.
  utils.run('jlpm run build:prod:release', { cwd: staging });

  // Run integrity
  utils.run('jlpm integrity');
}
