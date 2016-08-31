// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var webpack = require('webpack');
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

console.log('Generating bundles...');


function JupyterLabPlugin(options) {
  options = options || {};
  this.externals = options.externals || [];
}

JupyterLabPlugin.prototype.apply = function(compiler) {
  var externals = this.externals;
  compiler.plugin('emit', function(compilation, callback) {
    var sources = [];

    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {
      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {
        var deps = [];
        if (module.getAllModuleDependencies) {
          deps = module.getAllModuleDependencies();
        }
        if (!module.request) {
          console.log('skipped module', module.request);
          return;
        }

        // Look for explicit external
        if (module.external) {
          console.log('skipping external', module.request);
          return;
        }

        // Look for named externals
        var rootPackage = getPackage(module.request);
        if (externals.indexOf(rootPackage.name) !== -1) {
          console.log('skipping named external', module.request);
          return;
        }

        // TODO: handle context dependencies
        var source = module.source().source();
        for (var dep of deps) {
          var id = dep.id;
          var request = dep.request;
          if (!request || request.indexOf('!') !== -1) {
            console.log('skipped dep', request);
            continue;
          }
          request = (
            'require("jupyterlab!' + findImport(request, dep.issuer) + '")'
          );
          source = source.replace('__webpack_require__(' + id + ')', request);
        }
        var header = 'define("' + findName(module.request);
        header += '", function (require, exports, module) {\n'
        source = header + source + '\n}),\n';
        sources.push(source);
      });
    });

    // Insert this list into the Webpack build as a new file asset:
    compilation.assets['custom.bundle.js'] = {
      source: function() {
        return sources.join('\n\n');
      },
      size: function() {
        return sources.join('\n\n').length;
      }
    };

    callback();
  });
};


// From a request - find its package root.
function findRoot(request) {
  if (path.extname(request)) {
    request = path.dirname(request);
  }
  while (true) {
    try {
      require.resolve(path.join(request, 'package.json'));
      return request;
    } catch (err) {
      request = path.dirname(request);
    }
  }
}


// Get the package.json associated with a file.
function getPackage(request) {
  var rootPath = findRoot(request);
  return require(path.join(rootPath, 'package.json'));
}


// From a request - find a version-mangled define name.
function findName(request) {
  var rootPath = findRoot(request);
  var package = getPackage(rootPath);
  var modPath = request.slice(rootPath.length + 1);
  var name = package.name + ':' + package.version;
  if (modPath) {
    name += '/' + modPath;
  }
  return name;
}


// From a request - find its semver-mangled import path.
function findImport(request, issuer) {
  var rootPath = findRoot(request);
  var rootPackage = getPackage(rootPath);
  var issuerPath = findRoot(issuer);
  var issuerPackage = getPackage(issuer);
  var modPath = request.slice(rootPath.length + 1);
  var name = rootPackage.name;
  var semver = issuerPackage.dependencies[name] || rootPackage.version;
  if (semver.indexOf('file:') === 0) {
    var sourcePath = path.resolve(issuerPath, semver.slice('file:'.length));
    var sourcePackage = getPackage(sourcePath);
    semver = sourcePackage.version;
  }
  name += ':' + semver;
  if (modPath) {
    name += '/' + modPath;
  }
  return name;
}


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
    new JupyterLabPlugin({
      externals: ['codemirror']
    })
  ],
  externals: [
    function(context, request, callback) {
      if (request === 'codemirror' || request.indexOf('codemirror/') === 0) {
        return callback(null, "amd jupyterlab!" + request);
      }
      callback();
    },
  ]
}
