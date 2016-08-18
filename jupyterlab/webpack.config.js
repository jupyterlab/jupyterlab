// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var fs = require('fs');
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var helpers = require('jupyterlab/scripts/extension_helpers');
var shimmer = require('./shim-maker');

// Get the CodeMirror files to create external bundle.
var CodeMirrorFiles = helpers.CODEMIRROR_FILES;
CodeMirrorFiles.push('codemirror/lib/codemirror.js');

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

var loaders = [
  { test: /\.css$/, loader: ExtractTextPlugin.extract("style-loader", "css-loader") },
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


module.exports = [
// Application bundles
{
  entry: {
    'main': './index.js',
    'vendor': helpers.VENDOR_FILES
  },
  output: {
    path: './build',
    filename: '[name].bundle.js',
    publicPath: './',
    library: '[name]'
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
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
      filename: "vendor.bundle.js"
    }),
    new ExtractTextPlugin("[name].css")
  ],
  externals: helpers.DEFAULT_EXTERNALS
},
// JupyterLab bundle
{
  entry: './build/jupyterlab-shim.js',
  output: {
      filename: 'lab.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'lab'],
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin("lab.css")
  ],
  bail: true,
  devtool: 'source-map',
  externals: helpers.BASE_EXTERNALS
},
// CodeMirror bundle
{
  entry: {
    'codemirror': CodeMirrorFiles
  },
  output: {
      filename: 'codemirror.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'CodeMirror'],
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin("codemirror.css")
  ],
  bail: true,
  devtool: 'source-map'
},
// Jupyter-js-services bundle
{
  entry: 'jupyter-js-services',
  output: {
      filename: 'services.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'services'],
  },
  module: {
    loaders: loaders
  },
  bail: true,
  devtool: 'source-map',
  externals: helpers.phosphorExternals
},
// Phosphor bundle
{
  entry: './build/phosphor-shim.js',
  output: {
      filename: 'phosphor.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'phosphor']
  },
  bail: true,
  devtool: 'source-map'
}
]
