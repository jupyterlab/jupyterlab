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
import * as commander from 'commander';
import { run } from './utils';


commander
    .description('Build an extension')
    .usage('[options] <path>')
    .option('--prod', 'build in prod mode (default is dev)')
    .option('--watch')
    .action(
        async (cmd) => {
            let node_env = 'development';
            if (cmd.prod) {
                node_env = 'production';
            }
            const packagePath = path.resolve(cmd.args[0]);

            const webpack = require.resolve('webpack-cli/bin/cli.js');
            const config = path.join(__dirname, 'webpack.config.ext.js');
            let cmdText = `node ${webpack} --config ${config}`;
            if (cmd.watch) {
                cmdText += ' --watch';
            }
            const env = { PACKAGE_PATH: packagePath, NODE_ENV: node_env };
            console.log(env);
            run(cmdText, { env: { ...process.env, ...env } });
        }
    );

commander.parse(process.argv);

// If no arguments supplied
if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(1);
}
