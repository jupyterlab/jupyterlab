// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
const data = require('./package.json');
const Build = require('@jupyterlab/builder').Build;
const miniSVGDataURI = require('mini-svg-data-uri');

const names = Object.keys(data.dependencies).filter(function (name) {
  const packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});

const extras = Build.ensureAssets({
  packageNames: names,
  output: './build'
});

module.exports = [
  {
    entry: ['./index.js'],
    output: {
      path: __dirname + '/build',
      filename: 'bundle.js'
    },
    // node: {
    //   fs: 'empty'
    // },
    bail: true,
    devtool: 'source-map',
    mode: 'development',
    module: {
      rules: [
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.html$/, type: 'asset/resource' },
        { test: /\.md$/, type: 'asset/source' },
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
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource' },
        {
          // In .css files, svg is loaded as a data URI.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: /\.css$/,
          type: 'asset',
          generator: {
            dataUrl: content => miniSVGDataURI(content.toString())
          }
        },
        {
          // In .ts and .tsx files (both of which compile to .js), svg files
          // must be loaded as a raw string instead of data URIs.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: /\.js$/,
          type: 'asset/resource'
        }
      ]
    }
  }
].concat(extras);
