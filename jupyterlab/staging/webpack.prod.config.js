// This file is auto-generated from the corresponding file in /dev_mode
const merge = require('webpack-merge').default;
const WPPlugin = require('@jupyterlab/builder').WPPlugin;
const config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: false
  },
  plugins: [
    new WPPlugin.JSONLicenseWebpackPlugin({
      excludedPackageTest: packageName =>
        packageName === '@jupyterlab/application-top'
    })
  ]
});

module.exports = config;
