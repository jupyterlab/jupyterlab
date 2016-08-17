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
try {
  fs.mkdirSync('./build')
} catch(err) {
  // Already exists
}

fs.writeFileSync('./build/phosphor-shim.js', shimmer('phosphor', 'lib'));
var jlabShim = shimmer('jupyterlab', 'lib', /.*index\.js$/);
fs.writeFileSync('./build/jupyterlab-shim.js', jlabShim);

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
// Application bundle
{
  entry: {
    'main': './index.js',
    'jupyterlab': './build/jupyterlab-shim.js',
    'CodeMirror': CodeMirrorFiles,
    'vendor': helpers.VENDOR_FILES
  },
  output: {
    path: __dirname + '/build',
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
      name: "jupyterlab",
      filename: "jupyterlab.bundle.js",
      chunks: ['main']
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
      filename: "vendor.bundle.js"
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: "CodeMirror",
      filename: "CodeMirror.bundle.js",
      chunks: ['jupyterlab']
    }),
    new ExtractTextPlugin("[name].css")
  ],
  externals: helpers.BASE_EXTERNALS
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
}
]
