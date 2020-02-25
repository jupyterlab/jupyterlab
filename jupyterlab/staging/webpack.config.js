// This file is auto-generated from the corresponding file in /dev_mode
/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

var plib = require('path');
var fs = require('fs-extra');
var Handlebars = require('handlebars');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

var Build = require('@jupyterlab/buildutils').Build;
var WPPlugin = require('@jupyterlab/buildutils').WPPlugin;
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

// Set up variables for the watch mode ignore plugins
let watched = {};
let ignoreCache = Object.create(null);
Object.keys(jlab.linkedPackages).forEach(function(name) {
  if (name in watched) return;
  const localPkgPath = require.resolve(plib.join(name, 'package.json'));
  watched[name] = plib.dirname(localPkgPath);
});

// Set up source-map-loader to look in watched lib dirs
let sourceMapRes = Object.values(watched).reduce((res, name) => {
  res.push(new RegExp(name + '/lib'));
  return res;
}, []);

/**
 * Sync a local path to a linked package path if they are files and differ.
 */
function maybeSync(localPath, name, rest) {
  const stats = fs.statSync(localPath);
  if (!stats.isFile(localPath)) {
    return;
  }
  const source = fs.realpathSync(plib.join(jlab.linkedPackages[name], rest));
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
 * A filter function set up to exclude all files that are not
 * in a package contained by the Jupyterlab repo. Used to ignore
 * files during a `--watch` build.
 */
function ignored(path) {
  path = plib.resolve(path);
  if (path in ignoreCache) {
    // Bail if already found.
    return ignoreCache[path];
  }

  // Limit the watched files to those in our local linked package dirs.
  let ignore = true;
  Object.keys(watched).some(name => {
    const rootPath = watched[name];
    const contained = path.indexOf(rootPath + plib.sep) !== -1;
    if (path !== rootPath && !contained) {
      return false;
    }
    const rest = path.slice(rootPath.length);
    if (rest.indexOf('node_modules') === -1) {
      ignore = false;
      maybeSync(path, name, rest);
    }
    return true;
  });
  ignoreCache[path] = ignore;
  return ignore;
}

const plugins = [
  new WPPlugin.NowatchDuplicatePackageCheckerPlugin({
    verbose: true,
    exclude(instance) {
      // ignore known duplicates
      return ['domelementtype', 'hash-base', 'inherits'].includes(
        instance.name
      );
    }
  }),
  new HtmlWebpackPlugin({
    chunksSortMode: 'none',
    template: plib.join('templates', 'template.html'),
    title: jlab.name || 'JupyterLab'
  }),
  new webpack.HashedModuleIdsPlugin(),
  // custom plugin for ignoring files during a `--watch` build
  new WPPlugin.FilterWatchIgnorePlugin(ignored),
  // custom plugin that copies the assets to the static directory
  new WPPlugin.FrontEndPlugin(buildDir, jlab.staticDir)
];

if (process.argv.includes('--analyze')) {
  plugins.push(new BundleAnalyzerPlugin());
}

module.exports = [
  {
    mode: 'development',
    entry: {
      main: ['whatwg-fetch', plib.resolve(buildDir, 'index.out.js')]
    },
    // Map Phosphor files to Lumino files.
    resolve: {
      alias: {
        '@phosphor/algorithm$': plib.resolve(
          __dirname,
          'node_modules/@lumino/algorithm/lib/index.js'
        ),
        '@phosphor/application$': plib.resolve(
          __dirname,
          'node_modules/@lumino/application/lib/index.js'
        ),
        '@phosphor/commands$': plib.resolve(
          __dirname,
          'node_modules/@lumino/commands/lib/index.js'
        ),
        '@phosphor/coreutils$': plib.resolve(
          __dirname,
          'node_modules/@lumino/coreutils/lib/index.js'
        ),
        '@phosphor/disposable$': plib.resolve(
          __dirname,
          'node_modules/@lumino/disposable/lib/index.js'
        ),
        '@phosphor/domutils$': plib.resolve(
          __dirname,
          'node_modules/@lumino/domutils/lib/index.js'
        ),
        '@phosphor/dragdrop$': plib.resolve(
          __dirname,
          'node_modules/@lumino/dragdrop/lib/index.js'
        ),
        '@phosphor/dragdrop/style': plib.resolve(
          __dirname,
          'node_modules/@lumino/widgets/style'
        ),
        '@phosphor/messaging$': plib.resolve(
          __dirname,
          'node_modules/@lumino/messaging/lib/index.js'
        ),
        '@phosphor/properties$': plib.resolve(
          __dirname,
          'node_modules/@lumino/properties/lib'
        ),
        '@phosphor/signaling': plib.resolve(
          __dirname,
          'node_modules/@lumino/signaling/lib/index.js'
        ),
        '@phosphor/widgets/style': plib.resolve(
          __dirname,
          'node_modules/@lumino/widgets/style'
        ),
        '@phosphor/virtualdom$': plib.resolve(
          __dirname,
          'node_modules/@lumino/virtualdom/lib/index.js'
        ),
        '@phosphor/widgets$': plib.resolve(
          __dirname,
          'node_modules/@lumino/widgets/lib/index.js'
        )
      }
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
          include: sourceMapRes,
          use: ['source-map-loader'],
          enforce: 'pre'
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
          // In .css files, svg is loaded as a data URI.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: { test: /\.css$/ },
          use: {
            loader: 'svg-url-loader',
            options: { encoding: 'none', limit: 10000 }
          }
        },
        {
          // In .ts and .tsx files (both of which compile to .js), svg files
          // must be loaded as a raw string instead of data URIs.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: { test: /\.js$/ },
          use: {
            loader: 'raw-loader'
          }
        }
      ]
    },
    watchOptions: {
      poll: 333
    },
    node: {
      fs: 'empty'
    },
    bail: true,
    devtool: 'inline-source-map',
    externals: ['node-fetch', 'ws'],
    plugins
  }
].concat(extraConfig);
