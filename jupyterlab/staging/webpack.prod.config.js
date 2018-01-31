
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var merge = require('webpack-merge');
var webpack = require('webpack');
var common = require('./webpack.config');

module.exports = merge(common, {
  devtool: 'source-map',
  plugins: [
    new UglifyJSPlugin({
      sourceMap: true,
      parallel: true,
      uglifyOptions: {
        beautify: false,
        ecma: 6,
        mangle: true,
        compress: false,
        comments: false,
      }
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
});
