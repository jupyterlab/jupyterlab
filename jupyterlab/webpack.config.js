// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var findImports = require('find-imports');

console.log('Generating config...');

// Get the list of vendor files.
var VENDOR_FILES = findImports('../lib/**/*.js', { flatten: true });


console.log('Generating bundles...');

module.exports = {
  entry: {
    jupyterlab: './index.js',
    vendor: VENDOR_FILES
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    publicPath: './lab/'
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader", {
          publicPath: './'
        })
      },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file-loader' },
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: 'file-loader' },
      // required to load font-awesome
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml' }
    ]
  },
  plugins: [
    new ExtractTextPlugin('[name].css'),
    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')
  ],
  externals: {
    jquery: '$',
    'jquery-ui': '$'
  }
}
