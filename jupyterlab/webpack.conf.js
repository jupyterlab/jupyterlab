// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

module.exports = {
  entry: './index.js',
  output: {
    path: __dirname + "/build",
    filename: "bundle.js",
    publicPath: "lab/"
  },
  node: {
    fs: "empty"
  },
  debug: true,
  bail: true,
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file'},
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: "file" },
      // required to load font-awesome
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/font-woff" },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/font-woff" },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/octet-stream" },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=image/svg+xml" }
    ]
  },
  externals: {
      "base/js/namespace": "base/js/namespace",
      "notebook/js/outputarea": "notebook/js/outputarea",
      "services/kernels/comm": "services/kernels/comm"
  }
}
