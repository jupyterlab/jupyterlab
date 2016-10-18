// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var buildExtension = require('jupyterlab-extension-builder/lib/builder').buildExtension;


console.log('Generating bundles...');


buildExtension({
  name: 'main',
  entry: './index',
  outputDir: './build',
  config: {
    output: {
      publicPath: 'lab/'
    }
  }
});

buildExtension({
  name: 'extensions',
  entry: './extensions',
  outputDir: './build',
  config: {
    output: {
      publicPath: 'lab/'
    },
    module: {
      noParse: [/xterm/]  // Xterm ships a UMD module
    }
  }
});


module.exports = {
  entry: {
    loader: './loader'
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
