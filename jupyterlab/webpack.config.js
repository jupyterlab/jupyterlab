var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');
var Handlebars = require('handlebars');
var crypto = require('crypto');
var package_data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

// Ensure a clear build directory.
var buildDir = './build';
fs.ensureDirSync(buildDir);

fs.copySync('./package.json', './build/package.json');

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

fs.writeFileSync(path.resolve(buildDir, 'index.out.js'), result);


// Handle watch mode for the linked packages.
var localLinked = {};
var watchedPaths = [];
if (process.argv.indexOf('--watch') !== -1) {
  Object.keys(jlab.linkedPackages).forEach(function (name) {
    var localPath = require.resolve(path.join(name, 'package.json'));
    localLinked[name] = path.dirname(localPath);
  });
}


/**
 * Watch a local path if it is a file that has not been seen.
 */
function maybeWatch(localPath, name) {
  var stats = fs.statSync(localPath);
  if (!stats.isFile(localPath) || watchedPaths.indexOf(localPath) !== -1) {
    return;
  }
  watchedPaths.push(localPath);
  var rootPath = localLinked[name];
  var rest = localPath.slice(rootPath.length);
  var source = path.join(jlab.linkedPackages[name], rest);
  fs.watchFile(source, { "interval": 500 }, function(curr) {
    if (!curr || curr.nlink === 0) {
      return;
    }
    try {
      console.log('updating', path.join(name, rest));
      fs.copySync(source, localPath);
    } catch (err) {
      console.error(err);
    }
  });
}


// Create the hash
var hash = crypto.createHash('md5');
hash.update(fs.readFileSync('./package.json'));
var digest = hash.digest('hex');
fs.writeFileSync(path.resolve(buildDir, 'hash.md5'), digest);


module.exports = {
  entry:  path.resolve(buildDir, 'index.out.js'),
  output: {
    path: path.resolve(buildDir),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.json$/, use: 'json-loader' },
      { test: /\.html$/, use: 'file-loader' },
      { test: /\.md$/, use: 'raw-loader' },
      { test: /\.js$/, use: ['source-map-loader'], enforce: 'pre',
        exclude: path.join(process.cwd(), 'node_modules')
      },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' }
    ],
  },
  watchOptions: {
    ignored: function(localPath) {
      // Limit the watched files to those in our local linked package dirs.
      var ignore = true;
      Object.keys(localLinked).forEach(function (name) {
        var rootPath = localLinked[name];
        if (localPath.slice(0, rootPath.length) === rootPath) {
          var stats = fs.statSync(localPath);
          var rest = source.slice(rootPath.length);
          if (rest.indexOf('node_modules') === -1) {
            ignore = false;
            maybeWatch(localPath, name);
          }
        }
      });
      return ignore;
    }
  },
  node: {
    fs: 'empty'
  },
  bail: true,
  devtool: 'cheap-source-map'
}
