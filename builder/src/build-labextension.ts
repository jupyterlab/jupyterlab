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
import webpack from 'webpack';
import generateConfig from './extensionConfig';

// import { run } from '@jupyterlab/buildutils';

commander
  .description('Build an extension')
  .option('--development', 'build in development mode (implies --source-map)')
  .option('--source-map', 'generate source maps')
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
    const devtool = cmd.sourceMap ? 'source-map' : undefined;

    // const webpack = require.resolve('webpack-cli/bin/cli.js');
    // const config = path.join(__dirname, 'webpack.config.ext.js');
    // let cmdText = `node "${webpack}" --config "${config}" --mode ${mode}`;
    // if (cmd.watch) {
    //   cmdText += ' --watch';
    // }
    // const env = {
    //   PACKAGE_PATH: packagePath,
    //   NODE_ENV: mode,
    //   CORE_PATH: corePath,
    //   STATIC_URL: cmd.staticUrl as string,
    //   SOURCE_MAP: sourceMap
    // };
    // Object.keys(env).forEach((k: keyof typeof env) => {
    //   process.env[k] = env[k];
    // })

    const config = generateConfig({
      packagePath,
      mode,
      corePath,
      staticUrl: cmd.staticUrl,
      devtool
    });

    webpack(config, (err: any, stats: any) => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return;
      }

      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
      }

      if (stats.hasWarnings()) {
        console.warn(info.warnings);
      }

      // Log result...
      console.log('Done!!!');
    });

    // Run in this directory so we resolve to the right webpack and loaders
    // run(cmdText, { cwd: __dirname, env: { ...process.env, ...env } });
  });

commander.parse(process.argv);

// If no arguments supplied
if (!process.argv.slice(2).length) {
  commander.outputHelp();
  process.exit(1);
}
