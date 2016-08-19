// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var fs = require('fs');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var findImports = require('find-imports');
var helpers = require('jupyterlab/scripts/extension_helpers');


console.log('Generating config...');

// Get the list of vendor files.
var VENDOR_FILES = findImports('../lib/**/*.js', { flatten: true });

// Create the external library shims.
// First make sure the build folder exists.
try {
  fs.mkdirSync('./build')
} catch(err) {
  if (err.code !== 'EEXIST') {
    throw err;
  }
}
for (var lib of ['phosphor', 'jupyterlab', 'jupyter-js-services']) {
  var shim = helpers.createShim(lib);
  fs.writeFileSync('./build/' + lib + '-shim.js', shim);
}


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


console.log('Generating bundles...');


// The parallel Webpack build configurations.
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
    library: ['jupyter', 'application', '[name]']
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
    jupyterlab: './build/jupyterlab-shim.js',
    vendor: VENDOR_FILES
  },
  output: {
      filename: 'jupyterlab.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'externals', 'jupyterlab']
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin('[name].css'),
    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')
  ],
  bail: true,
  devtool: 'source-map',
  externals: helpers.BASE_EXTERNALS.concat([
    helpers.createShimHandler('jupyter-js-services')
  ])
},
// CodeMirror bundle
{
  entry: {
    'codemirror': ['codemirror/lib/codemirror.css', 'codemirror']
  },
  output: {
      filename: '[name].bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'externals', 'codemirror']
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin('[name].css')
  ],
  bail: true,
  devtool: 'source-map'
},
// Jupyter-js-services bundle
{
  entry: './build/jupyter-js-services-shim.js',
  output: {
      filename: 'jupyter-js-services.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'externals', 'jupyter-js-services'],
  },
  module: {
    loaders: loaders
  },
  bail: true,
  devtool: 'source-map',
  externals: helpers.BASE_EXTERNALS
},
// Phosphor bundle
{
  entry: './build/phosphor-shim.js',
  output: {
      filename: 'phosphor.bundle.js',
      path: './build',
      publicPath: './',
      library: ['jupyter', 'externals', 'phosphor']
  },
  bail: true,
  devtool: 'source-map'
}
]
