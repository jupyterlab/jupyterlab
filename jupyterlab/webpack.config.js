// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise/auto');

var childProcess = require('child_process');
var buildExtension = require('./build/packages/extension-builder/src/builder').buildExtension;
var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');


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

// Get the module aliases and copy styles.
var alias = {};
var files = fs.readdirSync('./build/packages');
for (var i = 0; i < files.length; i++) {
  var package = path.basename(files[i]);
  var target = path.resolve('./build/packages/' + files[i] + '/src');
  if (fs.existsSync(path.join('../packages', package, 'style'))) {
    var source = path.join('../packages', package, 'style');
    var styleTarget = path.join(target, 'style');
    fs.copySync(source, styleTarget);
  }
  alias['@jupyterlab/' + package] = target;
}


buildExtension({
  name: 'main',
  entry: './build/jupyterlab/src/main',
  outputDir: './build',
  config: {
    output: {
      publicPath: 'lab/',
    },
    resolve: {
      alias
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
    loader: './build/jupyterlab/src/loader'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    libraryTarget: 'this',
    library: 'jupyter'
  },
  resolve: {
    alias
  },
  node: {
    fs: 'empty'
  },
  bail: true,
  devtool: 'source-map'
}
