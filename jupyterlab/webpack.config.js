var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var Handlebars = require('handlebars');
var crypto = require('crypto');
var package_data = require('./package.json');

// Ensure a clear build directory.
var buildDir = './build';
fs.removeSync(buildDir);
fs.ensureDirSync(buildDir);

fs.copySync('./package.json', './build/package.json');

// Create the entry point file.
var source = fs.readFileSync('index.js').toString();
var template = Handlebars.compile(source);
var data = { jupyterlab_extensions: package_data.jupyterlab.extensions };
var result = template(data);

fs.writeFileSync(path.resolve(buildDir, 'index.out.js'), result);


// Create the hash
var hash = crypto.createHash('md5');
hash.update(fs.readFileSync('./package.json'));
var digest = hash.digest('hex');
fs.writeFileSync(path.resolve(buildDir, 'hash.md5'), digest);


// Note that we have to use an explicit local public path
// otherwise the urls in the extracted CSS will point to the wrong
// location.
// See https://github.com/webpack-contrib/extract-text-webpack-plugin/tree/75cb09eed13d15cec8f974b1210920a7f249f8e2
var cssLoader = ExtractTextPlugin.extract({
  use: 'css-loader',
  fallback: 'style-loader',
  publicPath: './'
});


module.exports = {
  entry:  path.resolve(buildDir, 'index.out.js'),
  output: {
    path: path.resolve(buildDir),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: cssLoader },
      { test: /\.json$/, use: 'json-loader' },
      { test: /\.html$/, use: 'file-loader' },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' }
    ],
  },
  node: {
    fs: 'empty'
  },
  bail: true,
  devtool: 'source-map',
  plugins: [
      new ExtractTextPlugin('[name].css')
    ]
}
