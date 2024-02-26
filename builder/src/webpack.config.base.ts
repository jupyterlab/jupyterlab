// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import * as webpack from 'webpack';
import miniSVGDataURI from 'mini-svg-data-uri';

const rules = [
  { test: /\.raw\.css$/, type: 'asset/source' },
  {
    test: /(?<!\.raw)\.css$/,
    use: [require.resolve('style-loader'), require.resolve('css-loader')]
  },
  { test: /\.txt$/, type: 'asset/source' },
  { test: /\.md$/, type: 'asset/source' },
  { test: /\.(jpg|png|gif)$/, type: 'asset/resource' },
  { test: /\.js.map$/, type: 'asset/resource' },
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/resource'
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/resource'
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/resource'
  },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource' },
  {
    // In .css files, svg is loaded as a data URI.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.css$/,
    type: 'asset',
    generator: {
      dataUrl: (content: any) => miniSVGDataURI(content.toString())
    }
  },
  {
    // In .ts and .tsx files (both of which compile to .js), svg files
    // must be loaded as a raw string instead of data URIs.
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.js$/,
    type: 'asset/source'
  },
  {
    test: /\.m?js$/,
    type: 'javascript/auto'
  },
  {
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  },
  {
    test: /\.c?js/,
    resolve: {
      fullySpecified: false
    }
  }
];

const watch = process.argv.includes('--watch');

module.exports = {
  bail: !watch,
  module: { rules },
  resolve: {
    fallback: {
      url: false,
      buffer: false,
      crypto: false,
      // See https://github.com/webpack/webpack/blob/3471c776059ac2d26593ea39f9c47c1874253dbb/lib/ModuleNotFoundError.js#L13-L42
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser')
    }
  },
  watchOptions: {
    poll: 500,
    aggregateTimeout: 1000
  },
  output: {
    hashFunction: 'sha256'
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ]
};
