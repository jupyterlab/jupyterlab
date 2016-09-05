// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Support for Node 0.10
// See https://github.com/webpack/css-loader/issues/144
require('es6-promise').polyfill();

var webpack = require('webpack');
var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');


console.log('Generating bundles...');


/**
  TODOs
  - Add our headers and marker text
  - Handle the context functions
  - Handle the other bundles
  - Create the custom loader
  - Create a manifest with each module and its dependencies
*/

function JupyterLabPlugin(options) {
  options = this.options = options || {};
  this.name = options.name || 'jupyter';
}


// Notes
// We can't replace __webpack_require__ during compilation because
//  it is hard-coded in several places
// We have to set the module id directly because it is used verbatim
// to add the requires and we can't necessarily parse them in context
// dependencies.

// We can't replace the module ids directly, as it messes with compilation
// We can replace them in regular modules (ones with a userRequest)
// Context modules we'll have to assemble ourselves or use a better lookup
// since they are not clearly delimited

// During the emit phase we create our own mangled stuff


JupyterLabPlugin.prototype.apply = function(compiler) {
  var pluginName = this.name;
  var requireName = '__' + pluginName + '_require__';
  var defineName = pluginName + 'Define';
  var publicPath = compiler.options.output.publicPath;

  compiler.plugin('emit', function(compilation, callback) {

    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {

      var sources = [];
      var manifest = {};

      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {

        // We don't allow externals.
        if (module.external) {
          throw Error('Cannot use externals:', module.userRequest);
        }

        var source = module.source().source();

        // Regular modules.
        if (module.userRequest) {
          // Handle ensure blocks with and without inline comments.
          source = handleEnsure(
            source, publicPath, /__webpack_require__.e.*?\*\/\((\d+)/
          );
          source = handleEnsure(
            source, publicPath, /__webpack_require__.e\((\d+)/
          );

          // Replace the require statements with the semver-mangled name.
          for (var dep of module.getAllModuleDependencies()) {
            var target = '__webpack_require__(' + dep.id + ')';
            var name = getRequireName(dep);
            var replacer = '__webpack_require__("' + name + '")';
            source = source.split(target).join(replacer);
          }
        // Context modules.
        } else if (module.context) {
          source = createContextModule(module);
          source = source.split('webpackContext').join(pluginName + 'Context');
        }

        // Handle public requires.
        var requireP = '__webpack_require__.p';
        var newRequireP = '"' + publicPath + '"';
        source = source.split(requireP).join(newRequireP);

        // Replace the require name with the custom one.
        source = source.split('__webpack_require__').join(requireName);

        // Create our header with a version-mangled defined name.
        var modName = getDefineName(module);
        var header = defineName + '("' + modName;
        header += '", function (module, exports, ' + requireName + ') {\n';

        // Combine code indent.
        source = header + source.split('\n').join('\n\t') + '\n})';
        sources.push(source);

        // Add dependencies to the manifest.
        var deps = [];
        for (var dep of module.dependencies) {
          if (dep.id && dep.id !== module.id) {
            deps.push(getRequireName(dep));
          }
        }
        manifest[modName] = deps;
      });

      var code = sources.join(',\n\n');

      // Insert this list into the Webpack build as a new file asset:
      var chunkName = chunk.name || chunk.id;
      compilation.assets[chunkName + '.custom.bundle.js'] = {
        source: function() {
          return code;
        },
        size: function() {
          return code.length;
        }
      };

      compilation.assets[chunkName + '.manifest.txt'] = {
        source: function() {
          return JSON.stringify(manifest);
        },
        size: function() {
          return JSON.stringify(manifest).length;
        }
      }
    });

    callback();
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
  if (!module.context) {
    return '__ignored__';
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


// Create our own mangled context module source.
function createContextModule(module) {
  // Modeled after Webpack's ContextModule.js.
  var str;
  if (module.dependencies && module.dependencies.length > 0) {
    var map = {};
    module.dependencies.slice().sort(function(a, b) {
      if(a.userRequest === b.userRequest) return 0;
      return a.userRequest < b.userRequest ? -1 : 1;
    }).forEach(function(dep) {
      if (dep.module)
        map[dep.userRequest] = getRequireName(dep.module);
    });
    str = [
      "\tvar map = ", JSON.stringify(map, null, "\t"), ";\n",
      "function webpackContext(req) {\n",
      "\treturn __webpack_require__(webpackContextResolve(req));\n",
      "};\n",
      "function webpackContextResolve(req) {\n",
      "\treturn map[req] || (function() { throw new Error(\"Cannot find module '\" + req + \"'.\") }());\n",
      "};\n",
      "webpackContext.keys = function webpackContextKeys() {\n",
      "\treturn Object.keys(map);\n",
      "};\n",
      "webpackContext.resolve = webpackContextResolve;\n",
      "module.exports = webpackContext;\n",
      "webpackContext.id = \"" + getDefineName(module) + "\";\n"
    ];
  } else {
    str = [
      "\tfunction webpackContext(req) {\n",
      "\tthrow new Error(\"Cannot find module '\" + req + \"'.\");\n",
      "}\n",
      "webpackContext.keys = function() { return []; };\n",
      "webpackContext.resolve = webpackContext;\n",
      "module.exports = webpackContext;\n",
      "webpackContext.id = \"" + getDefineName(module) + "\";\n"
    ];
  }
  return str.join('\t');
}


// Handle an ensure block.
function handleEnsure(source, publicPath, regex) {
  while (regex.test(source)) {
    var match = source.match(regex);
    var chunkId = match[1];
    var replacement = ('__webpack_require__.e("' + publicPath +
            chunkId + '"');
    source = source.replace(regex, replacement);
  }
  return source;
}


module.exports = [{
  entry: {
    jupyterlab: './index.js'
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
    chunkFilename: '[chunkhash].bundle.js',
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
