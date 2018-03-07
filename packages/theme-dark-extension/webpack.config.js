const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './style/index.css',
  output: {
    path: path.resolve(__dirname, 'static'),
    // we won't use this JS file, only the extracted CSS
    filename: 'ignore.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      {
        test: /\.svg/,
        use: [
          {
            loader: 'svg-url-loader',
            options: {
            }
          },
          {
            loader: 'svgo-loader',
            options: {
              plugins: [
              ]
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|gif|ttf)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10000
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('index.css'),
  ]
};
