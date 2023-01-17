const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const crypto = require('crypto');

// Workaround for loaders using "md4" by default, which is not supported in FIPS-compliant OpenSSL
const cryptoOrigCreateHash = crypto.createHash;
crypto.createHash = algorithm =>
  cryptoOrigCreateHash(algorithm == 'md4' ? 'sha256' : algorithm);

module.exports = {
  entry: './raw.js',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'style'),
    hashFunction: 'sha256'
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'index.css'
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader'
      },
      /* Use null-loader to drop resources that are not used in the CSS */
      {
        test: /\.(jpg|png|gif)$/,
        use: 'null-loader'
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      },
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: 'null-loader'
      }
    ]
  }
};
