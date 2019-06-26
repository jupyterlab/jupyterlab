/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var plib = require('path');
var fs = require('fs-extra');
var Handlebars = require('handlebars');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
var Visualizer = require('webpack-visualizer-plugin');

var Build = require('@jupyterlab/buildutils').Build;
var package_data = require('./package.json');

// Handle the extensions.
var jlab = package_data.jupyterlab;
var extensions = jlab.extensions;
var mimeExtensions = jlab.mimeExtensions;
var packageNames = Object.keys(mimeExtensions).concat(Object.keys(extensions));

// Ensure a clear build directory.
var buildDir = plib.resolve(jlab.buildDir);
if (fs.existsSync(buildDir)) {
  fs.removeSync(buildDir);
}
fs.ensureDirSync(buildDir);

// Build the assets
var extraConfig = Build.ensureAssets({
  packageNames: packageNames,
  output: jlab.outputDir
});

// Create the entry point file.
var source = fs.readFileSync('index.js').toString();
var template = Handlebars.compile(source);
var data = {
  jupyterlab_extensions: extensions,
  jupyterlab_mime_extensions: mimeExtensions
};
var result = template(data);

fs.writeFileSync(plib.join(buildDir, 'index.out.js'), result);
fs.copySync('./package.json', plib.join(buildDir, 'package.json'));
fs.copySync(
  plib.join(jlab.outputDir, 'imports.css'),
  plib.join(buildDir, 'imports.css')
);

// Set up variables for watch mode.
var watched = {};
var ignoreCache = Object.create(null);
Object.keys(jlab.watchedPackages).forEach(function(name) {
  if (name in watched) return;
  var localPath = require.resolve(plib.join(name, 'package.json'));
  watched[name] = plib.dirname(localPath);
});

/**
 * Sync a local path to a linked package path if they are files and differ.
 */
function maybeSync(localPath, name, rest) {
  var stats = fs.statSync(localPath);
  if (!stats.isFile(localPath)) {
    return;
  }
  var source = fs.realpathSync(plib.join(jlab.watchedPackages[name], rest));
  if (source === fs.realpathSync(localPath)) {
    return;
  }
  fs.watchFile(source, { interval: 500 }, function(curr) {
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
 * A WebPack Plugin that copies the assets to the static directory and
 * fixes the output of the HTMLWebpackPlugin
 */
function JupyterFrontEndPlugin() {}

JupyterFrontEndPlugin.prototype.apply = function(compiler) {
  compiler.hooks.afterEmit.tap(
    'JupyterFrontEndPlugin',
    function() {
      // Copy the static assets.
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
    }.bind(this)
  );
};

JupyterFrontEndPlugin.prototype._first = true;

const ignored = path => {
  path = plib.resolve(path);
  if (path in ignoreCache) {
    return ignoreCache[path];
  }

  // Limit the watched files to those in our local linked package dirs.
  var ignore = true;
  Object.keys(watched).some(function(name) {
    console.error(name);
    // Bail if already found.
    var rootPath = watched[name];
    var contained = path.indexOf(rootPath + plib.sep) !== -1;
    if (path !== rootPath && !contained) {
      return false;
    }
    var rest = path.slice(rootPath.length);
    if (rest.indexOf('node_modules') === -1) {
      ignore = false;
      maybeSync(path, name, rest);
    }
    return true;
  });
  ignoreCache[path] = ignore;
  return ignore;
};

class JupyterIgnorePlugin extends webpack.IgnorePlugin {
  constructor() {
    super({});
  }

  checkIgnore(result) {
    if (!result) return result;
    return ignored(result.resource) ? result : null;
  }
}

class JupyterIgnoringWatchFileSystem {
  constructor(wfs) {
    this.wfs = wfs;
  }

  watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
    const notIgnored = path => !ignored(path);

    const ignoredFiles = files.filter(ignored);
    const ignoredDirs = dirs.filter(ignored);

    const watcher = this.wfs.watch(
      files.filter(notIgnored),
      dirs.filter(notIgnored),
      missing,
      startTime,
      options,
      (
        err,
        filesModified,
        dirsModified,
        missingModified,
        fileTimestamps,
        dirTimestamps,
        removedFiles
      ) => {
        if (err) return callback(err);
        for (const path of ignoredFiles) {
          fileTimestamps.set(path, 1);
        }

        for (const path of ignoredDirs) {
          dirTimestamps.set(path, 1);
        }

        callback(
          err,
          filesModified,
          dirsModified,
          missingModified,
          fileTimestamps,
          dirTimestamps,
          removedFiles
        );
      },
      callbackUndelayed
    );

    return {
      close: () => watcher.close(),
      pause: () => watcher.pause(),
      getContextTimestamps: () => {
        const dirTimestamps = watcher.getContextTimestamps();
        for (const path of ignoredDirs) {
          dirTimestamps.set(path, 1);
        }
        return dirTimestamps;
      },
      getFileTimestamps: () => {
        const fileTimestamps = watcher.getFileTimestamps();
        for (const path of ignoredFiles) {
          fileTimestamps.set(path, 1);
        }
        return fileTimestamps;
      }
    };
  }
}

class JupyterWatchIgnorePlugin {
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('WatchIgnorePlugin', () => {
      compiler.watchFileSystem = new JupyterIgnoringWatchFileSystem(
        compiler.watchFileSystem
      );
    });
  }
}

const plugins = [
  new JupyterWatchIgnorePlugin(),
  new DuplicatePackageCheckerPlugin({
    verbose: true,
    exclude(instance) {
      // ignore known duplicates
      return ['domelementtype', 'hash-base', 'inherits'].includes(
        instance.name
      );
    }
  }),
  new HtmlWebpackPlugin({
    template: plib.join('templates', 'template.html'),
    title: jlab.name || 'JupyterLab'
  }),
  new webpack.HashedModuleIdsPlugin(),
  new JupyterFrontEndPlugin({})
];

if (process.argv.includes('--analyze')) {
  plugins.push(new Visualizer());
}

module.exports = [
  {
    mode: 'development',
    entry: {
      main: ['whatwg-fetch', plib.resolve(buildDir, 'index.out.js')]
    },
    output: {
      path: plib.resolve(buildDir),
      publicPath: '{{page_config.fullStaticUrl}}/',
      filename: '[name].[chunkhash].js'
    },
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    },
    module: {
      rules: [
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.md$/, use: 'raw-loader' },
        { test: /\.txt$/, use: 'raw-loader' },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre',
          // eslint-disable-next-line no-undef
          exclude: /node_modules/
        },
        { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
        { test: /\.js.map$/, use: 'file-loader' },
        {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/font-woff'
        },
        {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/font-woff'
        },
        {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/octet-stream'
        },
        {
          test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/octet-stream'
        },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
        {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=image/svg+xml'
        }
      ]
    },
    watchOptions: {
      ignored: /node_modules/,
      poll: 333
    },
    node: {
      fs: 'empty'
    },
    bail: true,
    devtool: 'inline-source-map',
    externals: ['node-fetch', 'ws'],
    plugins,
    stats: {
      chunkModules: true
    }
  }
].concat(extraConfig);
