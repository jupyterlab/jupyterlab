// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var childProcess = require('child_process');
var buildExtension = require('@jupyterlab/extension-builder/lib/builder').buildExtension;
var webpack = require('webpack');


// Get the git description.
try {
  var notice = childProcess.execSync('git describe', { encoding: 'utf8' });
} catch (e) {
  var notice = 'unknown';
}


// Get the python package version.
var cwd = process.cwd();
process.chdir('..');
try {
  var version = childProcess.execSync('python setup.py --version', { encoding: 'utf8' });
} catch (e) {
  var version = 'unknown';
}
process.chdir(cwd);


// Build the main extension.
console.log('Generating bundles...');

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
          'GIT_DESCRIPTION': JSON.stringify(notice.trim()),
          'JUPYTERLAB_VERSION': JSON.stringify(version.trim())
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
