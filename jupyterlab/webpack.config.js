var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');
var Handlebars = require('handlebars');
var crypto = require('crypto');
var package_data = require('./package.json');
var watch = require('watch');
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


/**
 * Watch a package for changes and copy them to the local node_modules.
 */
function watchPackage(packagePath) {
  packagePath = fs.realpathSync(packagePath);
  var data = require(path.join(packagePath, 'package.json'));

  try {
    var targetBase = require.resolve(path.join(data.name, 'package.json'));
  } catch (err) {
    console.error(err);
    return;
  }
  targetBase = fs.realpathSync(path.dirname(targetBase));

  if (targetBase === packagePath) {
    return;
  }

  var options = {
    "ignoreDotFiles": true,
    "interval": 0.5,
    "filter": function(f, stat) {
      return f.split(path.sep).indexOf('node_modules') === -1;
    }
  }

  watch.watchTree(packagePath, options, function (f, curr, prev) {
    if (typeof f !== 'object' && curr !== null) {
      var target = path.join(targetBase, f.slice(packagePath.length));
      if (curr.nlink !== 0) {
        try {
          console.log('copying', target);
          fs.copySync(f, target);
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
}


// Handle watch mode for the linked packages.
var localPaths = [];
if (process.argv.indexOf('--watch') !== -1) {
  Object.keys(jlab.linkedPackages).forEach(function (name) {
    watchPackage(jlab.linkedPackages[name]);
    var localPath = require.resolve(path.join(name, 'package.json'));
    localPaths.push(path.dirname(localPath));
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
    ignored: function(search) {
      // Limit the watched files to those in our local linked package dirs.
      var ignore = true;
      localPaths.forEach(function(localPath) {
        if (search.slice(0, localPath.length) === localPath) {
          var rest = search.slice(localPath.length);
          if (rest.indexOf('node_modules') === -1) {
            ignore = false;
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
