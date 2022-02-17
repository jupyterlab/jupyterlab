// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/inpage/index.ts',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'lib/lib-inpage'),
    filename: 'inpage.js',
    publicPath: '/',
    hashFunction: 'sha256'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.ts$/, use: ['ts-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.md$/, use: 'raw-loader' },
      { test: /\.txt$/, use: 'raw-loader' },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/octet-stream'
      },
      {
        test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/octet-stream'
      },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        use: {
          loader: 'svg-url-loader',
          options: { encoding: 'none', limit: 10000 }
        }
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.js$/,
        use: {
          loader: 'raw-loader'
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': '{}',
      process: { cwd: () => '/' }
    })
  ]
};
