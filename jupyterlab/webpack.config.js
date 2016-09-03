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
  Overall todos:
  - Get the same content in this bundle as the existing one
  - Create a sibling bundle with the same content as the existing one
  - Create the other build artifacts
  - Dynamically require the other bundles/artifacts by mangled name
  - Make sure we are in an r.js bundle format
  - Create a manifest file with the modules so it can be used to create
    bundle config.

  - We can use the other `compilation.assets` directly, we don't need to
  - do anything special to those modules, we just need a way to load them
**/

function JupyterLabPlugin(options) {
  this.options = options || {};
  // Known libraries that are not able to be AMD-wrapped
  // See https://github.com/requirejs/r.js/blob/master/README.md#convert-commonjs-modules
  this.unwrappable = this.options.unwrappable || [];
  this.unwrappable.push('htmlparser2');
}

JupyterLabPlugin.prototype.apply = function(compiler) {
  // Add our externals to the list of externals;
  var externals = compiler.options.externals || [];
  if (!Array.isArray(externals)) {
    externals = [externals];
  }
  compiler.options.externals = externals.concat(this.unwrappable);
  unwrappable = this.unwrappable;

  compiler.plugin('emit', function(compilation, callback) {
    var sources = [];
    var modules = [];

    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {
      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {
        var deps = [];
        if (module.getAllModuleDependencies) {
          deps = module.getAllModuleDependencies();
        }

        if (!module.context) {
          // These were ignored by WebPack
          return;
        }

        var modRequest = module.request;
        if (!modRequest) {
          // TODO: These are the extra bundles.
          console.log('skipped module', module.context);
          return;
        }

        // Look for explicit external
        if (module.external) {
          console.log('skipping external', module.request);
          return;
        }

        // Skip modules handled by the extract text plugin.
        if (module.request.indexOf('extract-text-webpack-plugin') !== -1) {
          return;
        }

        // Look for loaders
        if (module.loaders.length) {
          modRequest = modRequest.slice(modRequest.lastIndexOf('!') + 1);
        }


        var modPackage = getPackage(modRequest);
        var source = module.source().source();
        for (var dep of deps) {
          var id = dep.id;
          var request = dep.request;
          var search = '__webpack_require__(' + id + ')';
          if (!request) {
            source = source.split(search).join('UNDEFINED');
            continue;
          }
          if (request.indexOf('extract-text-webpack-plugin') !== -1) {
            source = source.replace(search + ';\n', '');
            continue;
          }
          if (!path.extname(request)) {
            request = require.resolve(request);
          }
          if (dep.loaders && dep.loaders.length) {
            request = request.slice(request.lastIndexOf('!') + 1);
          }
          request = findImport(request, dep.issuer);
          request = 'require("jupyterlab!' + request + '")';
          if (id === module.id) {
            // Circular reference, use `exports` explicitly.
            request = 'exports';
          }
          source = source.split(search).join(request);
        }
        source = source.replace('__webpack_require__', 'null');
        var modPath = findName(modRequest);
        modules.push(modPath);
        var header = 'define("' + modPath;
        header += '", function (require, exports, module) {\n'
        // Combine with indent.
        source = header + source.split('\n').join('\n  ') + '\n})';
        sources.push(source);
      });
    });

    // Assemble the r.js bundle.
    // TODO: Add config for dynamic modules.
    // var code = 'require.config({ baseUrl: "'
    //code += compilation.outputOptions.publicPath + '" }),\n\n'
    //code += sources.join(',\n\n');


    var promises = [];
    for (var name of unwrappable) {
      promises.push(createUnwrappable(name, compilation));
    }
    Promise.all(promises).then(function(outputs) {
      sources = sources.concat(outputs);
      var code = sources.join(',\n\n');

      // Insert this list into the Webpack build as a new file asset:
      debugger;
      compilation.assets['custom.bundle.js'] = {
        source: function() {
          return code;
        },
        size: function() {
          return code.length;
        }
      };

      compilation.assets['custom.manifest.txt'] = {
        source: function() {
          return modules.join('\n');
        },
        size: function() {
          return modules.join('\n').length;
        }
      }

      callback();
    });
  });
};


// Create a shim for an unwrappable module.
function createUnwrappable(name, compilation) {
  var modPath = require.resolve(name);
  var library = findName(modPath);
  var options = {
    entry: [name],
    output: {
      path: '/build',
      filename: 'out.js',
      publicPath: compilation.options.output.publicPath,
      library: library,
      libraryTarget: 'amd'
    }
  }
  var mem = new MemoryFS();
  options.module = compilation.options.module;
  var compiler = webpack(options);
  compiler.context = name;
  compiler.outputFileSystem = mem;

  return new Promise(function (resolve, reject) {
    compiler.run(function(err, stats) {
      var fileContent = mem.readFileSync('/build/out.js', 'utf8');
      resolve(fileContent);
    });
  });
}



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
  var name = package.name + '@' + package.version;
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
  name += '@' + semver;
  if (modPath) {
    name += '/' + modPath;
  }
  return name;
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
