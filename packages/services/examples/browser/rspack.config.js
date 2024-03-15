/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const rspack = require('@rspack/core');

module.exports = {
  entry: './build/index.js',
  mode: 'development',
  output: {
    path: require('path').join(__dirname, 'build'),
    filename: 'bundle.js'
  },
  plugins: [
    new rspack.DefinePlugin({
      // Needed for various packages using cwd(), like the path polyfill
      process: { cwd: () => '/', env: {} }
    })
  ],
  bail: true
};
