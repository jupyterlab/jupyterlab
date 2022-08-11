/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
  entry: './raw.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'style'),
    hashFunction: 'sha256'
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'index.css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
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
