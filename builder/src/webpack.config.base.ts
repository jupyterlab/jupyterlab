// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';
import * as webpack from 'webpack';

const rules = [
  { test: /\.css$/, use: ['style-loader', 'css-loader'] },
  { test: /\.txt$/, use: 'raw-loader' },
  { test: /\.md$/, use: 'raw-loader' },
  { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
  { test: /\.js.map$/, use: 'file-loader' },
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/font-woff'
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/font-woff'
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    use: 'url-loader?limit=10000&mimetype=application/octet-stream'
  },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
  {
    // In .css files, svg is loaded as a data URI.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.css$/,
    use: {
      loader: 'svg-url-loader',
      options: { encoding: 'none', limit: 10000 }
    }
  },
  {
    // In .ts and .tsx files (both of which compile to .js), svg files
    // must be loaded as a raw string instead of data URIs.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.js$/,
    use: {
      loader: 'raw-loader'
    }
  }
];

// Map Phosphor files to Lumino files.
const stylePath = path.join(
  path.dirname(require.resolve('@lumino/widgets/package.json')),
  'style'
);

let phosphorAlias = {};

try {
  phosphorAlias = {
    '@phosphor/algorithm$': require.resolve('@lumino/algorithm'),
    '@phosphor/application$': require.resolve('@lumino/application'),
    '@phosphor/commands$': require.resolve('@lumino/commands'),
    '@phosphor/coreutils$': require.resolve('@lumino/coreutils'),
    '@phosphor/disposable$': require.resolve('@lumino/disposable'),
    '@phosphor/domutils$': require.resolve('@lumino/domutils'),
    '@phosphor/dragdrop$': require.resolve('@lumino/dragdrop'),
    '@phosphor/dragdrop/style': stylePath,
    '@phosphor/messaging$': require.resolve('@lumino/messaging'),
    '@phosphor/properties$': require.resolve('@lumino/properties'),
    '@phosphor/signaling': require.resolve('@lumino/signaling'),
    '@phosphor/widgets/style': stylePath,
    '@phosphor/virtualdom$': require.resolve('@lumino/virtualdom'),
    '@phosphor/widgets$': require.resolve('@lumino/widgets')
  };
} catch (e) {
  // no Phosphor shims required
}

module.exports = {
  devtool: 'source-map',
  bail: true,
  module: { rules },
  resolve: { alias: { url: false, buffer: false, ...phosphorAlias } },
  watchOptions: {
    poll: 500,
    aggregateTimeout: 1000
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': '{}',
      process: {}
    })
  ]
};
