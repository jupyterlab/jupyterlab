/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('path');
const rspack = require('@rspack/core');

module.exports = {
  entry: './raw.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'style'),
    hashFunction: 'xxhash64'
  },
  plugins: [new rspack.CssExtractRspackPlugin({ filename: 'index.css' })],
  experiments: { css: false },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
        type: 'javascript/auto'
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/inline'
      },
      /* Use null-loader to drop resources that are not used in the CSS */
      {
        test: /\.(jpg|png|gif)$/,
        use: 'null-loader'
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      }
    ]
  }
};
