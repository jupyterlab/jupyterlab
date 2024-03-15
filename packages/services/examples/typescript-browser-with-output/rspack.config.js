/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('path');
const rspack = require('@rspack/core');

module.exports = {
  entry: ['./build/index.js'],
  mode: 'development',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      { test: /\.md$/, type: 'asset/source' },
      { test: /\.txt$/, type: 'asset/source' },
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        // eslint-disable-next-line no-undef
        exclude: /node_modules/
      },
      { test: /\.(jpg|png|gif)$/, type: 'asset/resource' },
      { test: /\.js.map$/, type: 'asset/resource' },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource' },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      }
    ]
  },
  bail: true,
  plugins: [
    new rspack.DefinePlugin({
      // Needed for various packages using cwd(), like the path polyfill
      process: { cwd: () => '/', env: {} }
    })
  ]
};
