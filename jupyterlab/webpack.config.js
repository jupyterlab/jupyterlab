// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var fs = require('fs');
var helpers = require('jupyterlab/scripts/extension_helpers');
var shimmer = require('./shim-maker');

// Create the phosphor and jupyterlab shims.
fs.writeFileSync('./build/phosphor-shim.js', shimmer('phosphor'));
fs.writeFileSync('./build/jupyterlab-shim.js', shimmer('jupyterlab'));

var loaders = [
  { test: /\.css$/, loader: 'style-loader!css-loader' },
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


module.exports = [
// Application bundle
{
  entry: './index.js',
  output: {
    path: __dirname + '/build',
    filename: 'bundle.js',
    publicPath: 'lab/'
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
  externals: helpers.DEFAULT_EXTERNALS
},
// Codemirror bundle
{
   entry: 'codemirror',
   output: {
      filename: 'codemirror.bundle.js',
      path: './build',
      library: 'codemirror'
   },
   module: {
    loaders: loaders
   },
   bail: true,
   devtool: 'source-map'
},
// Jupyter-js-services bundle
{
    entry: 'jupyter-js-services',
    output: {
        filename: 'services.bundle.js',
        path: './build',
        library: ['jupyter', 'services'],
    },
    module: {
      loaders: loaders
    },
    bail: true,
    devtool: 'source-map'
},
// Phosphor bundle
{
    entry: './build/phosphor-shim.js',
    output: {
        filename: 'phosphor.bundle.js',
        path: './build',
        library: 'phosphor',
    },
    bail: true,
    devtool: 'source-map'
},
// JupyterLab bundle
{
    entry: './build/jupyterlab-shim.js',
    output: {
        filename: 'jupyterlab.bundle.js',
        path: './build',
        library: ['jupyter', 'lab'],
    },
    module: {
      loaders: loaders
    },
    bail: true,
    devtool: 'source-map'
}
]
