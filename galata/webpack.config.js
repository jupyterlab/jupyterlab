// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

const path = require('path');
const webpack = require('webpack');
const miniSVGDataURI = require('mini-svg-data-uri');

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
      { test: /\.md$/, type: 'asset/source' },
      { test: /\.txt$/, type: 'asset/source' },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      },
      { test: /\.(jpg|png|gif)$/, type: 'asset/resource' },
      { test: /\.js.map$/, type: 'asset/resource' },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      {
        test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset'
      },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource' },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        type: 'asset',
        generator: {
          dataUrl: content => miniSVGDataURI(content.toString())
        }
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.js$/,
        type: 'asset/source'
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
