// This file is auto-generated from the corresponding file in /dev_mode
const merge = require('webpack-merge');
const config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: false
  }
});

module.exports = config;
