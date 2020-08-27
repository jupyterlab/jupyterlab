#!/usr/bin/env node
/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

// Build an extension

// Inputs:
// Path to extension (required)
// Dev vs prod (dev is default)
// Output path (defaults to <extension>/build)

// Outputs
// Webpack build assets

import * as path from 'path';
import commander from 'commander';
import { run } from '@jupyterlab/buildutils';

commander
  .description('Build an extension')
  .option('--development', 'build in development mode')
  .requiredOption('--core-path <path>', 'the core package directory')
  .option(
    '--static-url <url>',
    'url for build assets, if hosted outside the built extension'
  )
  .option('--watch')
  .action(async cmd => {
    const mode = cmd.development ? 'development' : 'production';
    const corePath = path.resolve(cmd.corePath || process.cwd());
    const packagePath = path.resolve(cmd.args[0]);

    const webpack = require.resolve('webpack-cli/bin/cli.js');
    const config = path.join(__dirname, 'webpack.config.ext.js');
    let cmdText = `node ${webpack} --config ${config} --mode ${mode}`;
    if (cmd.watch) {
      cmdText += ' --watch';
    }
    const env = {
      PACKAGE_PATH: packagePath,
      NODE_ENV: mode,
      CORE_PATH: corePath,
      STATIC_URL: cmd.staticUrl
    };
    run(cmdText, { env: { ...process.env, ...env } });
  });

commander.parse(process.argv);

// If no arguments supplied
if (!process.argv.slice(2).length) {
  commander.outputHelp();
  process.exit(1);
}
