// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import miniSVGDataURI from 'mini-svg-data-uri';

const rules = [
  {
    test: /(?<!\.raw)\.css$/,
    use: [require.resolve('style-loader'), require.resolve('css-loader')]
  },
  { test: /\.raw\.css$/, type: 'asset/source' },
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
      dataUrl: {
        content: (content: any) => miniSVGDataURI(content.content),
        mimetype: 'image/svg+xml'
      }
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
      crypto: false
    }
  },
  watchOptions: {
    poll: 500,
    aggregateTimeout: 1000
  },
  output: {
    hashFunction: 'xxhash64'
  }
};
