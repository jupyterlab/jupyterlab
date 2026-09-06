/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const rspack = require('@rspack/core');
const miniSVGDataURI = require('mini-svg-data-uri');

module.exports = {
  entry: ['./build/index.js'],
  output: {
    path: __dirname + '/build',
    filename: 'bundle.js'
  },
  bail: true,
  devtool: 'cheap-source-map',
  mode: 'production',
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.raw\.css$/, type: 'asset/source' },
      { test: /\.html$/, type: 'asset/resource' },
      { test: /\.js.map$/, type: 'asset/resource' },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        type: 'asset',
        generator: {
          dataUrl: {
            content: content => miniSVGDataURI(content.content),
            mimetype: 'image/svg+xml'
          }
        }
      },
      {
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
    new rspack.DefinePlugin({
      process: { cwd: () => '/', env: {} }
    })
  ]
};
