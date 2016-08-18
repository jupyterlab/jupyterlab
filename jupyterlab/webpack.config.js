// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var fs = require('fs');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

console.log('Generating config...');
var helpers = require('jupyterlab/scripts/extension_helpers');
var shimmer = require('./shim-maker');

// Create the Phosphor and JupyterLab shims.
// First make sure the build folder exists.
try {
  fs.mkdirSync('./build')
} catch(err) {
  if (err.code !== 'EEXIST') {
    throw e;
  }
}
fs.writeFileSync('./build/phosphor-shim.js', shimmer('phosphor'));
fs.writeFileSync('./build/jupyterlab-shim.js', shimmer('jupyterlab'));

// The default `module.loaders` config.
var loaders = [
  { test: /\.css$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader') },
  { test: /\.json$/, loader: 'json-loader' },
  { test: /\.html$/, loader: 'file-loader' },
  // jquery-ui loads some images
  { test: /\.(jpg|png|gif)$/, loader: 'file-loader' },
  // required to load font-awesome
  { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream' },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
  { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml' },
]


// The actual Webpack parallel configurations.
module.exports = [
// Application bundles
{
  entry: {
    main: './index.js',
    plugins: './plugins.js',
  },
  output: {
    path: './build',
    filename: '[name].bundle.js',
    publicPath: './',
    library: ['jupyter', '[name]']
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map',
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin('[name].css')
  ],
  externals: helpers.EXTENSION_EXTERNALS
},
// JupyterLab bundles
{
  entry: {
    lab: './build/jupyterlab-shim.js',
    services: ['jupyter-js-services'],
    codemirror: helpers.CODEMIRROR_FILES,
    vendor: helpers.VENDOR_FILES
  },
  output: {
      filename: '[name].bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', '[name]']
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin('[name].css'),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'services',
      filename: 'services.bundle.js',
      chunks: ['lab']
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'codemirror',
      filename: 'codemirror.bundle.js',
      chunks: ['lab']
    }),
    // This becomes the entry point and must be loaded first.
    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')
  ],
  bail: true,
  devtool: 'source-map',
  externals: helpers.BASE_EXTERNALS
},
// Phosphor bundle
{
  entry: {
    phosphor: './build/phosphor-shim.js'
  },
  output: {
      filename: '[name].bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', '[name]']
  },
  bail: true,
  devtool: 'source-map'
}
]
