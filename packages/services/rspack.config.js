/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const version = require('./package.json').version;

module.exports = {
  entry: './lib',
  output: {
    filename: './dist/index.js',
    library: '@jupyterlab/services',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    publicPath: 'https://unpkg.com/@jupyterlab/services@' + version + '/dist/'
  },
  bail: true,
  mode: 'production',
  devtool: 'source-map'
};
