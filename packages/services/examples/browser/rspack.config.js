/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const rspack = require('@rspack/core');

module.exports = {
  entry: './build/index.js',
  mode: 'development',
  output: {
    path: require('path').join(__dirname, 'build'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        exclude: /\.raw\.css$/,
        type: 'javascript/auto',
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader']
      },
      { test: /\.raw\.css$/, type: 'asset/source' }
    ]
  },
  plugins: [
    new rspack.DefinePlugin({
      // Needed for various packages using cwd(), like the path polyfill
      process: { cwd: () => '/', env: {} }
    }),
    new rspack.CssExtractRspackPlugin({
      filename: '[name].[contenthash:8].css'
    })
  ],
  bail: true
};
