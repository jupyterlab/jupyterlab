const merge = require('webpack-merge').default;
const config = require('./webpack.config');
const WPPlugin = require('@jupyterlab/builder').WPPlugin;
const LicenseWebpackPlugin = require('license-webpack-plugin')
  .LicenseWebpackPlugin;

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
