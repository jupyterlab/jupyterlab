// This file is auto-generated from the corresponding file in /dev_mode
const TerserPlugin = require('terser-webpack-plugin');
var merge = require('webpack-merge');
var config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        sourceMap: true,
        terserOptions: {
          compress: false,
          ecma: 6,
          mangle: true,
          output: {
            beautify: false,
            comments: false
          },
          safari10: true
        },
        cache: process.platform !== 'win32'
      })
    ]
  }
});

module.exports = config;
