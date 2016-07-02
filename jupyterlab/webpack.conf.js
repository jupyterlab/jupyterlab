// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var webpack = require('webpack');
var glob = require('glob');

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

// The list of known vendor libraries/files.
var vendorFiles = [
  'ansi_up',
  'backbone',
  'codemirror',
  'codemirror/addon/mode/multiplex.js',
  'codemirror/lib/codemirror.css',
  'codemirror/mode/meta.js',
  'codemirror/mode/python/python.js',
  'codemirror/mode/stex/stex.js',
  'codemirror/mode/gfm/gfm.js',
  'codemirror/mode/javascript/javascript.js',
  'codemirror/mode/css/css.js',
  'codemirror/mode/julia/julia.js',
  'codemirror/mode/r/r.js',
  'codemirror/mode/markdown/markdown.js',
  'codemirror/lib/codemirror.css',
  'diff-match-patch',
  'es6-promise',
  'font-awesome/css/font-awesome.min.css',
  'jquery-ui/themes/smoothness/jquery-ui.min.css',
  'jupyter-js-widgets',
  'jupyter-js-widgets/css/widgets.min.css',
  'marked',
  'moment',
  'sanitizer',
  'simulate-event',
  'xterm',
  'xterm/src/xterm.css'
]
// Manually add all phosphor entry points.
// (This will be replaced with a glob of the condensed phosphor library)
glob.sync("node_modules/phosphor-*/**/index.js").forEach(function(file) {
  vendorFiles.push(file.replace('node_modules/', ''));
});


module.exports = {
  entry: {
    main: './index.js',
    vendor: vendorFiles
  },
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
  devtool: 'inline-source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file'},
      { test: /\.svg$/, loader: 'file' },
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: "file" },
      // required to load font-awesome
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" }
    ]
  },
  externals: {
    jquery: '$',
    'jquery-ui': '$'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin("vendor", "vendor.bundle.js"),
  ]
}
