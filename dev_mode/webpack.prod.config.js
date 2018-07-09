var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var merge = require('webpack-merge');
var common = require('./webpack.config');

module.exports = merge(common, {
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
        }
      })
    ]
  }
});
