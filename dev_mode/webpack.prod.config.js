const merge = require('webpack-merge').default;
const config = require('./webpack.config');
const LicenseWebpackPlugin = require('license-webpack-plugin')
  .LicenseWebpackPlugin;

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  output: {
    // Add version argument when in production so the Jupyter server
    // does not cache the files the static file handler.
    filename: '[name].[contenthash].js?v=[contenthash]'
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new LicenseWebpackPlugin({
      perChunkOutput: false,
      outputFilename: 'third-party-licenses.txt',
      excludedPackageTest: packageName =>
        packageName === '@jupyterlab/application-top'
    })
  ]
});

module.exports = config;
