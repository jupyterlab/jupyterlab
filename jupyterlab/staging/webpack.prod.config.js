// This file is auto-generated from the corresponding file in /dev_mode
const merge = require('webpack-merge').default;
const LicenseWebpackPlugin = require('license-webpack-plugin')
  .LicenseWebpackPlugin;
const config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: false
  },
  plugins: [
    new LicenseWebpackPlugin({
      perChunkOutput: false,
      outputFilename: 'third-party-licenses.txt'
    })
  ]
});

module.exports = config;
