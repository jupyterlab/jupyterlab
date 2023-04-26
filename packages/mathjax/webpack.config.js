/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('path');

module.exports = {
  entry: './src/jupyter-component.js',
  output: {
    filename: 'jupyter-component.js',
    path: path.resolve(__dirname, 'lib')
  }
};
