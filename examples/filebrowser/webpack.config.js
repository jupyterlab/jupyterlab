/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const webpack = require('webpack');
const miniSVGDataURI = require('mini-svg-data-uri');

module.exports = {
  entry: ['./build/index.js'],
  output: {
    path: __dirname + '/build',
    filename: 'bundle.js'
  },
  bail: true,
  devtool: 'source-map',
  mode: 'production',
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.html$/, type: 'asset/resource' },
      { test: /\.md$/, type: 'asset/source' },
      { test: /\.js.map$/, type: 'asset/resource' },
      {
        // In .css files, svg is loaded as a data URI.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        type: 'asset/inline',
        generator: {
          dataUrl: content => miniSVGDataURI(content.toString())
        }
      },
      {
        // In .ts and .tsx files (both of which compile to .js), svg files
        // must be loaded as a raw string instead of data URIs.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.js$/,
        type: 'asset/source'
      },
      {
        test: /\.(png|jpg|gif|ttf|woff|woff2|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        type: 'asset'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      // Needed for various packages using cwd(), like the path polyfill
      process: { cwd: () => '/', env: {} }
    })
  ]
};
