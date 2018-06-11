const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    index: './style/index.css',
    embed: './style/embed.css'
  },
  output: {
    path: path.resolve(__dirname, 'static'),
    // we won't use these JS files, only the extracted CSS
    filename: '[name].js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader']},
      { test: /\.svg/, use: [
        { loader: 'svg-url-loader', options: {} },
        { loader: 'svgo-loader', options: {plugins: []} }
      ]},
      { test: /\.(png|jpg|gif|ttf|woff|woff2|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: [{ loader: 'url-loader', options: {limit: 10000} }]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].css',
      chunkFilename: '[id].css'
    })
  ]
};
