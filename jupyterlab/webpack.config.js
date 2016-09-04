// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var webpack = require('webpack');
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var MemoryFS = require("memory-fs");


console.log('Generating bundles...');


/**
  TODOs
  - Extract the css
  - Handle the context functions
  - Handle the bundles
  - Strip out the overall header and the text between our markers
  - Create the custom loader
  - Create a manifest with each module and its dependencies
*/

function JupyterLabPlugin(options) {
  options = this.options = options || {};
  this.name = options.name || 'jupyter';
}


var ConcatSource = require("webpack-sources").ConcatSource;


// Notes
// We can't replace __webpack_require__ during compilation because
//  it is hard-coded in several places


JupyterLabPlugin.prototype.apply = function(compiler) {
  var pluginName = this.name;
  var requireName = '__' + pluginName + '_require__';
  var defineName = pluginName + 'Define';
  var jsonpName = pluginName + 'Jsonp';

  compiler.plugin('compilation', function(compilation) {

    // Set of the module ids to use the semver-mangled require.
    compilation.plugin('before-module-ids', function(modules) {
      modules.forEach(function(module) {
        if (module.id === null || module.id === 0) {
          module.id = getRequireName(module);
        }
      })
    });

    // Mangle all of the chunk ids
    compilation.plugin('before-chunk-ids', function(chunks) {
      chunks.forEach(function(chunk) {
        // TODO
        //chunk.id = chunk.id ||  getChunkId(compilation, chunk);
      })
    });

    // Hook into the module rendering.
    compilation.moduleTemplate.plugin('render', function(moduleSource, module) {
      // Modeled after WebPack's FunctionModuleTemplatePlugin.
      var source = new ConcatSource();
      var defaultArguments = ["module", "exports"];
      if((module.arguments && module.arguments.length !== 0) || module.hasDependencies()) {
        defaultArguments.push('__webpack_require__');
      }
      var name = getDefineName(module);
      source.add('/** START DEFINE BLOCK FOR ' + name + ' **/\n');
      source.add(defineName + '("' + name + '", function(' + defaultArguments.concat(module.arguments || []).join(", ") + ") {\n\n");
      if(module.strict) source.add("\"use strict\";\n");
      source.add(moduleSource);
      source.add('\n\n})\n/** END DEFINE BLOCK FOR ' + name + ' **/\n');
      return source;
    });

  });

};


// From a request - find its package root.
function findRoot(request) {
  var orig = request;
  if (path.extname(request)) {
    request = path.dirname(request);
  }
  while (true) {
    try {
      var pkgPath = require.resolve(path.join(request, 'package.json'));
      var pkg = require(pkgPath);
      // Use public packages except for the local package.
      if (!pkg.private || request === process.cwd()) {
        return request;
      }
    } catch (err) {
      // no-op
    }
    var prev = request;
    request = path.dirname(request);
    if (request === prev) {
      throw Error('Could not find package for ' + orig);
    }
  }
}


// Get the package.json associated with a file.
function getPackage(request) {
  var rootPath = findRoot(request);
  return require(path.join(rootPath, 'package.json'));
}


// From a Webpack module object - find a version-mangled define name.
function getDefineName(module) {
  if (module.id === '__ignored__') {
    return module.id;
  }
  var request = module.userRequest || module.context;
  var rootPath = findRoot(request);
  var package = getPackage(rootPath);
  var modPath = request.slice(rootPath.length + 1);
  var name = package.name + '@' + package.version;
  if (modPath) {
    name += '/' + modPath;
  }
  return name;
}


// From a WebPack module object - find its semver-mangled require name.
function getRequireName(module) {
  if (!module.context) {
    return '__ignored__';
  }
  var issuer = module.issuer || module.userRequest;
  var request = module.userRequest || module.context;
  var rootPath = findRoot(request);
  var rootPackage = getPackage(rootPath);
  var issuerPath = findRoot(issuer);
  var issuerPackage = getPackage(issuer);
  var modPath = request.slice(rootPath.length + 1);
  var name = rootPackage.name;
  var semver = issuerPackage.dependencies[name] || rootPackage.version;
  if (issuerPackage.name === rootPackage.name) {
    // Allow patch version increments of itself.
    semver = '~' + rootPackage.version;
  } else if (semver.indexOf('file:') === 0) {
    var sourcePath = path.resolve(issuerPath, semver.slice('file:'.length));
    var sourcePackage = getPackage(sourcePath);
    // Allow patch version increments of local packages.
    semver = '~' + sourcePackage.version;
  }
  var id = name + '@' + semver;
  if (modPath) {
    id += '/' + modPath;
  }
  return id;
}


module.exports = [{
  entry: {
    jupyterlab: './index.js'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    publicPath: './lab/'
  },
  node: {
    fs: 'empty',
  },
  debug: true,
  bail: true,
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader'
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
    new JupyterLabPlugin()
  ],
},
{
  entry: {
    loader: './loader'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    publicPath: './lab',
    library: 'jupyterlab',
    libraryTarget: 'amd'
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map'
}
];
