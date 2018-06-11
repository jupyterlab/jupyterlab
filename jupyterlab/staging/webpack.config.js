/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var path = require('path');
var fs = require('fs-extra');
var Handlebars = require('handlebars');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');

var Build = require('@jupyterlab/buildutils').Build;
var package_data = require('./package.json');

// Handle the extensions.
var jlab = package_data.jupyterlab;
var extensions = jlab.extensions;
var mimeExtensions = jlab.mimeExtensions;
Build.ensureAssets({
  packageNames: Object.keys(mimeExtensions).concat(Object.keys(extensions)),
  output: jlab.outputDir
});

// Create the entry point file.
var source = fs.readFileSync('index.js').toString();
var template = Handlebars.compile(source);
var data = {
  jupyterlab_extensions: extensions,
  jupyterlab_mime_extensions: mimeExtensions,
};
var result = template(data);

// Ensure a clear build directory.
var buildDir = path.resolve(jlab.buildDir);
if (fs.existsSync(buildDir)) {
  fs.removeSync(buildDir);
}
fs.ensureDirSync(buildDir);

fs.writeFileSync(path.join(buildDir, 'index.out.js'), result);
fs.copySync('./package.json', path.join(buildDir, 'package.json'));
fs.copySync('./templates/error.html', path.join(buildDir, 'error.html'));

// Set up variables for watch mode.
var localLinked = {};
var ignoreCache = Object.create(null);
Object.keys(jlab.linkedPackages).forEach(function (name) {
  var localPath = require.resolve(path.join(name, 'package.json'));
  localLinked[name] = path.dirname(localPath);
});


/**
 * Sync a local path to a linked package path if they are files and differ.
 */
function maybeSync(localPath, name, rest) {
  var stats = fs.statSync(localPath);
  if (!stats.isFile(localPath)) {
    return;
  }
  var source = fs.realpathSync(path.join(jlab.linkedPackages[name], rest));
  if (source === fs.realpathSync(localPath)) {
    return;
  }
  fs.watchFile(source, { 'interval': 500 }, function(curr) {
    if (!curr || curr.nlink === 0) {
      return;
    }
    try {
      fs.copySync(source, localPath);
    } catch (err) {
      console.error(err);
    }
  });
}


/**
 * A WebPack Plugin that copies the assets to the static directory.
 */
function JupyterLabPlugin() { }

JupyterLabPlugin.prototype.apply = function(compiler) {
  compiler.hooks.afterEmit.tap('JupyterLabPlugin', function() {
    var staticDir = jlab.staticDir;
    if (!staticDir) {
      return;
    }
    // Ensure a clean static directory on the first emit.
    if (this._first && fs.existsSync(staticDir)) {
      fs.removeSync(staticDir);
    }
    this._first = false;
    fs.copySync(buildDir, staticDir);
  }.bind(this));
};

JupyterLabPlugin.prototype._first = true;


module.exports = {
  mode: 'development',
  entry: {
    main: ['whatwg-fetch', path.resolve(buildDir, 'index.out.js')]
  },
  output: {
    path: path.resolve(buildDir),
    publicPath: jlab.publicUrl || '{{base_url}}lab/static/',
    filename: '[name].[chunkhash].js'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Split out the vega files, which are large and not always needed.
        vega: {
          test: /[\\/]node_modules[\\/]vega/
        }
      }
    }
  },
  module: {
    rules: [
      { test: /^JUPYTERLAB_RAW_LOADER_/, use: 'raw-loader' },
      { test: /^JUPYTERLAB_URL_LOADER_/, use: 'url-loader?limit=10000' },
      { test: /^JUPYTERLAB_FILE_LOADER_/, use: 'file-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.md$/, use: 'raw-loader' },
      { test: /\.txt$/, use: 'raw-loader' },
      { test: /\.js$/, use: ['source-map-loader'], enforce: 'pre',
        // eslint-disable-next-line no-undef
        exclude: /node_modules/
      },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.otf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' }
    ],
  },
  watchOptions: {
    ignored: function(localPath) {
      localPath = path.resolve(localPath);
      if (localPath in ignoreCache) {
        return ignoreCache[localPath];
      }
      // Limit the watched files to those in our local linked package dirs.
      var ignore = true;
      Object.keys(localLinked).some(function (name) {
        // Bail if already found.
        var rootPath = localLinked[name];
        var contained = localPath.indexOf(rootPath + path.sep) !== -1;
        if (localPath !== rootPath && !contained) {
          return false;
        }
        var rest = localPath.slice(rootPath.length);
        if (rest.indexOf('node_modules') === -1) {
          ignore = false;
          maybeSync(localPath, name, rest);
        }
        return true;
      });
      ignoreCache[localPath] = ignore;
      return ignore;
    }
  },
  node: {
    fs: 'empty'
  },
  bail: true,
  devtool: 'source-map',
  plugins: [
    new DuplicatePackageCheckerPlugin({
      verbose: true,
      exclude(instance) {
        // ignore known duplicates
        return ['domelementtype', 'hash-base', 'inherits'].includes(instance.name);
      }
    }),
    new HtmlWebpackPlugin({
      template: path.join('templates', 'template.html'),
      title: jlab.name || 'JupyterLab'
    }),
    new webpack.HashedModuleIdsPlugin(),
    new JupyterLabPlugin({})
  ]
};
