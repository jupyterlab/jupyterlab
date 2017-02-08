// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var childProcess = require('child_process');
var buildExtension = require('@jupyterlab/extension-builder/lib/builder').buildExtension;
var webpack = require('webpack');


console.log('Generating bundles...');

try {
  var notice = childProcess.execSync('git describe', { encoding: 'utf8' });
} catch (e) {
  var notice = 'unknown';
}


buildExtension({
  name: 'main',
  entry: './build/main',
  outputDir: './build',
  config: {
    output: {
      publicPath: 'lab/',
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          'GIT_DESCRIPTION': JSON.stringify(notice.trim())
        }
      })
    ]
  }
});


module.exports = {
  entry: {
    loader: './build/loader'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    libraryTarget: 'this',
    library: 'jupyter'
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map'
}
