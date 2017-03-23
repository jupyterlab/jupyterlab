// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as ExtractTextPlugin
  from 'extract-text-webpack-plugin';

import * as path
  from 'path';

import * as webpack
  from 'webpack';

import {
  Config
} from 'webpack-config';

import {
  JupyterLabPlugin
} from './plugin';


/**
 * The default file loaders.
 */
const
DEFAULT_LOADERS = [
  { test: /\.json$/, use: 'json-loader' },
  { test: /\.html$/, use: 'file-loader' },
  { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
  { test: /\.js.map$/, use: 'file-loader' },
  { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
  { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' }
];


/**
 * Build a JupyterLab extension.
 *
 * @param options - The options used to build the extension.
 */
export
function buildExtension(options: IBuildOptions): Promise<void> {
  let name = options.name;

  if (!name) {
    throw Error('Must specify a name for the extension');
  }
  if (!options.entry) {
    throw Error('Must specify an entry module');
  }
  if (!options.outputDir) {
    throw Error('Must specify an output directory');
  }

  // Create the named entry point to the entryPath.
  let entry: { [key: string]: string } = {};
  entry[name] = options.entry;

  let config = new Config().merge({
    // The default options.
    entry: entry,
    output: {
      path: path.resolve(options.outputDir),
      filename: '[name].bundle.js',
      publicPath: `labextension/${name}`
    },
    node: {
      fs: 'empty'
    },
    bail: true,
    plugins: [new JupyterLabPlugin()]
  // Add the override options.
  }).merge(options.config || {});

  // Add the CSS extractors unless explicitly told otherwise.
  if (options.extractCSS !== false) {
    // Note that we have to use an explicit local public path
    // otherwise the urls in the extracted CSS will point to the wrong
    // location.
    // See https://github.com/webpack-contrib/extract-text-webpack-plugin/tree/75cb09eed13d15cec8f974b1210920a7f249f8e2
    let cssLoader = ExtractTextPlugin.extract({
      use: 'css-loader',
      fallback: 'style-loader',
      publicPath: './'
    });
    config.merge({
      module: {
        rules: [
          {
            test: /\.css$/,
            use: cssLoader
          }
        ]
      },
      plugins: [new ExtractTextPlugin('[name].css')]
    });
  }

  // Add the rest of the default loaders unless explicitly told otherwise.
  if (options.useDefaultLoaders !== false) {
    config.merge({
      module: {
        rules: DEFAULT_LOADERS
      }
    });
  }

  // Set up and run the WebPack compilation.
  let compiler = webpack(config);
  compiler.name = name;

  return new Promise<void>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);
        if ((err as any).details) {
          console.error((err as any).details);
        }
        reject(err);
      } else {
        console.log(`\n\nSuccessfully built "${name}":\n`);
        process.stdout.write(stats.toString({
          chunks: true,
          modules: false,
          chunkModules: false,
          colors: require('supports-color')
        }) + '\n');
        resolve();
      }
    });
  });
}


/**
 * The options used to build a JupyterLab extension.
 */
export
interface IBuildOptions {
  /**
   * The name of the extension.
   */
  name: string;

  /**
   * The module to load as the entry point.
   *
   * The module should export a plugin configuration or array of
   * plugin configurations.
   */
  entry: string;

  /**
   * The directory in which to put the generated bundle files.
   *
   * Relative directories are resolved relative to the current
   * working directory of the process.
   */
  outputDir: string;

  /**
   * Whether to extract CSS from the bundles (default is True).
   *
   * Note: no other CSS loaders should be used if not set to False.
   */
  extractCSS?: boolean;

  /**
   * Whether to use the default loaders for some common file types.
   *
   * See [[DEFAULT_LOADERS]].  The default is True.
   */
  useDefaultLoaders?: boolean;

  /**
   * Extra webpack configuration.
   */
  config?: webpack.Configuration;
}
