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

///////////////////////////////////////////////////////
// Portions of the below code handling watch mode and displaying output were
// adapted from the https://github.com/webpack/webpack-cli project, which has
// an MIT license (https://github.com/webpack/webpack-cli/blob/4dc6dfbf29da16e61745770f7b48638963fb05c5/LICENSE):
//
// Copyright JS Foundation and other contributors
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
///////////////////////////////////////////////////////

import * as path from 'path';
import { program as commander } from 'commander';
import webpack from 'webpack';
import generateConfig from './extensionConfig';
import { stdout as colors } from 'supports-color';

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
  .action(async (options, command) => {
    const mode = options.development ? 'development' : 'production';
    const corePath = path.resolve(options.corePath || process.cwd());
    const packagePath = path.resolve(command.args[0]);
    const devtool = options.sourceMap ? 'source-map' : undefined;

    const config = generateConfig({
      packagePath,
      mode,
      corePath,
      staticUrl: options.staticUrl,
      devtool,
      watchMode: options.watch
    });
    const compiler = webpack(config);

    let lastHash: string | null = null;

    function compilerCallback(err: any, stats: any) {
      if (!options.watch || err) {
        // Do not keep cache anymore
        compiler.purgeInputFileSystem();
      }

      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        throw new Error(err.details);
      }

      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
        if (!options.watch) {
          process.exit(2);
        }
      }

      if (stats.hash !== lastHash) {
        lastHash = stats.hash;
        const statsString = stats.toString({ colors });
        const delimiter = '';
        if (statsString) {
          process.stdout.write(`${statsString}\n${delimiter}`);
        }
      }
    }

    if (options.watch) {
      compiler.hooks.watchRun.tap('WebpackInfo', () => {
        console.error('\nWatch Compilation starting…\n');
      });
      compiler.hooks.done.tap('WebpackInfo', () => {
        console.error('\nWatch Compilation finished\n');
      });
    } else {
      compiler.hooks.run.tap('WebpackInfo', () => {
        console.error('\nCompilation starting…\n');
      });
      compiler.hooks.done.tap('WebpackInfo', () => {
        console.error('\nCompilation finished\n');
      });
    }

    if (options.watch) {
      compiler.watch(config[0].watchOptions || {}, compilerCallback);
      console.error('\nwebpack is watching the files…\n');
    } else {
      compiler.run((err: any, stats: any) => {
        if (compiler.close) {
          compiler.close((err2: any) => {
            compilerCallback(err || err2, stats);
          });
        } else {
          compilerCallback(err, stats);
        }
      });
    }
  });

commander.parse(process.argv);

// If no arguments supplied
if (!process.argv.slice(2).length) {
  commander.outputHelp();
  process.exit(1);
}
