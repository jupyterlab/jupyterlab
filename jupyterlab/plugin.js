// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * A WebPack plugin that generates custom bundles that use version and
 * semver-mangled require semantics.
 */
function JupyterLabPlugin(options) {
  options = this.options = options || {};
  this.name = options.name || 'jupyter';
}


/**
 * The css loader that should be used with the plugin.
 */
JupyterLabPlugin.cssLoader = ExtractTextPlugin.extract("style-loader", "css-loader", { publicPath: './' });


/**
 * Plugin installation, called by WebPack.
 *
 * @param compiler - The WebPack compiler object.
 */
JupyterLabPlugin.prototype.apply = function(compiler) {
  // Run the extract text plugin.
  compiler.apply(new ExtractTextPlugin('[name].css'));

  var pluginName = this.name;
  var publicPath = compiler.options.output.publicPath;
  if (!publicPath) {
    throw new Error('Must define a public path');
  }
  if (!publicPath.endsWith('/')) {
    publicPath += '/';
  }

  // Notes
  // We use the emit phase because it allows other plugins to act on the
  // output first.
  // We can't replace the module ids during compilation, because there are
  // places in the compilation that assume a numeric id.
  compiler.plugin('emit', function(compilation, callback) {

    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {

      var sources = [];

      // A mapping for each module name and its dependencies.
      var modules = {};

      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach(function(module) {

        // We don't allow externals.
        if (module.external) {
          throw Error('Cannot use externals:', module.userRequest);
        }

        // Parse each module.
        var source = parseModule(compilation, module, pluginName, publicPath);
        sources.push(source);

        // Add dependencies to the manifest.
        var deps = [];
        for (var i = 0; i < module.dependencies.length; i++) {
          var dep = module.dependencies[i];
          if (dep.id && dep.id !== module.id) {
            deps.push(getRequireName(dep));
          }
        }
        modules[getDefineName(module)] = deps;
      });

      var code = sources.join('\n\n');

      // Replace the original chunk file.
      // Use the first file name, because the mangling of the chunk
      // file names are private to WebPack.
      var fileName = chunk.files[0];
      compilation.assets[fileName] = {
        source: function() {
          return code;
        },
        size: function() {
          return code.length;
        }
      };

      // Create a manifest for the chunk.
      var manifest = {};
      if (chunk.entry) {
        manifest['entry'] = getDefineName(chunk.modules[0]);
      }
      manifest['hash'] = chunk.hash;
      manifest['id'] = chunk.id;
      manifest['name'] = chunk.name || chunk.id;
      manifest['files'] = chunk.files;
      manifest['modules'] = modules;

      compilation.assets[fileName + '.manifest'] = {
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


/**
 * Find a package root path from a request.
 *
 * @param request - The request path.
 *
 * @returns The path to the package root.
 */
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


/**
 * Get the package.json associated with a file.
 *
 * @param request - The request path.
 *
 * @returns The package.json object for the package.
 */
function getPackage(request) {
  var rootPath = findRoot(request);
  return require(path.join(rootPath, 'package.json'));
}


/**
 * Get the define name for a WebPack module.
 *
 * @param module - A parsed WebPack module object.
 *
 * @returns A version-mangled define name for the module.
 *    For example, "foo@1.0.1/lib/bar/baz.js".
 */
function getDefineName(module) {
  if (!module.context) {
    return '__ignored__';
  }
  var request = module.userRequest || module.context;
  var parts = request.split('!');
  var names = [];
  for (var i = 0; i < parts.length; i++) {
    names.push(getModuleVersionName(parts[i]));
  }
  return names.join('!');
}


/**
 * Get a mangled name for a path using the extact version.
 *
 * @param path - The absolute path of the module.
 *
 * @returns A version-mangled path (e.g. "foo@1.0.0/lib/bar/baz.js")
 */
function getModuleVersionName(path) {
  var rootPath = findRoot(path);
  var package = getPackage(rootPath);
  var modPath = path.slice(rootPath.length + 1);
  var name = package.name + '@' + package.version;
  if (modPath) {
    name += '/' + modPath;
  }
  return name;
}


/**
 * Get the require name for a WebPack module.
 *
 * @param module - A parsed WebPack module object.
 *
 * @returns A semver-mangled define name for the module.
 *    For example, "foo@^1.0.0/lib/bar/baz.js".
 */
function getRequireName(module) {
  if (!module.context) {
    return '__ignored__';
  }
  var issuer = module.issuer || module.userRequest;
  var request = module.userRequest || module.context;
  var requestParts = request.split('!');
  var parts = [];

  // Handle the loaders.
  for (var i = 0; i < requestParts.length - 1; i++) {
    parts.push(getModuleSemverName(requestParts[i], requestParts[i]));
  }
  // Handle the last part.
  var base = requestParts[requestParts.length - 1];
  parts.push(getModuleSemverName(base, issuer));
  return parts.join('!');
}


/**
 * Get the semver-mangled name for a request.
 *
 * @param modPath - The absolute path of the module.
 *
 * @param issuer - The path of the issuer of the module request.
 *
 * @returns A semver-mangled path (e.g. "foo@^1.0.0/lib/bar/baz.js")
 */
function getModuleSemverName(modPath, issuer) {
  var rootPath = findRoot(modPath);
  var rootPackage = getPackage(rootPath);
  var issuerPath = findRoot(issuer);
  var issuerPackage = getPackage(issuer);
  var modPath = modPath.slice(rootPath.length + 1);
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


/**
 * Create custom context module source.
 *
 * @param module - A parsed WebPack module object.
 *
 * @returns The new contents of the context module output.
 */
function createContextModule(module) {
  // Modeled after Webpack's ContextModule.js.
  var str;
  if (module.dependencies && module.dependencies.length > 0) {
    var map = {};
    module.dependencies.slice().sort(function(a, b) {
      if (a.userRequest === b.userRequest) {
        return 0;
      }
      return a.userRequest < b.userRequest ? -1 : 1;
    }).forEach(function(dep) {
      if (dep.module) {
        map[dep.userRequest] = getRequireName(dep.module);
      }
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


/**
 * Parse a WebPack module to generate a custom version.
 *
 * @param compilation - The Webpack compilation object.
 *
 * @param module - A parsed WebPack module object.
 *
 * @param pluginName - The name of the plugin.
 *
 * @param publicPath - The public path of the plugin.
 *
 * @returns The new module contents.
 */
function parseModule(compilation, module, pluginName, publicPath) {
  var requireName = '__' + pluginName + '_require__';
  var defineName = pluginName + 'Define';
  var source = module.source().source();

  // Regular modules.
  if (module.userRequest) {
    // Handle ensure blocks with and without inline comments.
    // From WebPack dependencies/DepBlockHelpers
    source = handleEnsure(
      compilation, source, publicPath, /__webpack_require__.e\/\*.*?\*\/\((\d+)/
    );
    source = handleEnsure(
      compilation, source, publicPath, /__webpack_require__.e\((\d+)/
    );

    // Replace the require statements with the semver-mangled name.
    var deps = module.getAllModuleDependencies();
    for (var i = 0; i < deps.length; i++) {
      var dep = deps[i];
      var target = '__webpack_require__(' + dep.id + ')';
      var name = getRequireName(dep);
      var replacer = '__webpack_require__("' + name + '")';
      source = source.split(target).join(replacer);
    }
  // Context modules.
  } else if (module.context) {
    // Context modules have to be assembled ourselves
    // because they are not clearly delimited in the text.
    source = createContextModule(module);
    source = source.split('webpackContext').join(pluginName + 'Context');
  }

  // Handle public requires.
  var requireP = '__webpack_require__.p';
  var newRequireP = '"' + publicPath + '"';
  source = source.split(requireP).join(newRequireP);

  // Replace the require name with the custom one.
  source = source.split('__webpack_require__').join(requireName);

  // Create our header and footer with a version-mangled defined name.
  var defineName = getDefineName(module);
  var header = '/** START DEFINE BLOCK for ' + defineName + ' **/\n';
  header += pluginName + '.define("' + defineName;
  header += '", function (module, exports, ' + requireName + ') {\n\t';
  var footer = '\n})\n/** END DEFINE BLOCK for ' + defineName + ' **/';

  // Combine code and indent.
  return header + source.split('\n').join('\n\t') + footer;
}


/**
 * Handle an ensure block.
 *
 * @param compilation - The Webpack compilation object.
 *
 * @param source - The raw module source.
 *
 * @param publicPath - The public path of the plugin.
 *
 * @param regex - The ensure block regex.
 *
 * @returns The new ensure block contents.
 */
function handleEnsure(compilation, source, publicPath, regex) {
  while (regex.test(source)) {
    var match = source.match(regex);
    var chunkId = match[1];
    var fileName = '';
    // Use the first file name, because the mangling of the chunk
    // file name is private to WebPack.
    compilation.chunks.forEach(function(chunk) {
      if (String(chunk.id) === match[1]) {
        fileName = chunk.files[0];
      }
    });
    var replacement = ('__webpack_require__.e("' + publicPath +
            fileName + '"');
    source = source.replace(regex, replacement);
  }
  return source;
}


module.exports = JupyterLabPlugin;
