// This file is auto-generated from the corresponding file in /dev_mode
const merge = require('webpack-merge').default;
const config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  output: {
    // Add version argument when in production so the Jupyter server
    // allows caching of files (i.e., does not set the CacheControl header to no-cache to prevent caching static files)
    filename: '[name].[contenthash].js?v=[contenthash]'
  },
  optimization: {
    minimize: false
  }
});

module.exports = config;
