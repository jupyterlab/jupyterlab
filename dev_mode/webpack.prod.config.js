var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var merge = require('webpack-merge');
var config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        parallel: true,
        sourceMap: true,
        uglifyOptions: {
          beautify: false,
          comments: false,
          compress: false,
          ecma: 6,
          mangle: true
        },
        cache: process.platform !== 'win32'
      })
    ]
  }
});

module.exports = config;
