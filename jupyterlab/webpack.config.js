// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

console.log('Generating bundles...');


function JupyterLabPlugin(options) {}

JupyterLabPlugin.prototype.apply = function(compiler) {
  compiler.plugin('emit', function(compilation, callback) {
    // Create a header string for the generated file:
    var modlist = ['In this build:\n\n'];

    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {
      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {
        if (!module.getAllModuleDependencies) {
          return;
        }
        var source = module.source().source();
        for (var dep of module.getAllModuleDependencies()) {
          var id = dep.id;
          var request = dep.request;
          // TODO: Mangle the request using package.json
          var path = 'require("' + request + '")';
          source = source.replace('__webpack_require__(' + id + ')', path);
        }
        var name = module.request;
        // TODO: Mangle the request using package.json
        var header = 'define("' + name + '", function (require, exports, module) {\n'
        source = header + source + '\n}),\n';
        modlist.push(source);
      });
    });

    // Insert this list into the Webpack build as a new file asset:
    compilation.assets['modlist.md'] = {
      source: function() {
        return modlist.join('\n\n');
      },
      size: function() {
        return modlist.join('\n\n').length;
      }
    };

    callback();
  });
};


module.exports = {
  entry: {
    jupyterlab: './index.js'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    publicPath: './lab/'
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader", {
          publicPath: './'
        })
      },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file-loader' },
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: 'file-loader' },
      // required to load font-awesome
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml' }
    ]
  },
  plugins: [
    new ExtractTextPlugin('[name].css'),
    new JupyterLabPlugin()
  ]
}
