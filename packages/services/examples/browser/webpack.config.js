const webpack = require('webpack');

module.exports = {
  entry: './build/index.js',
  mode: 'development',
  output: {
    path: require('path').join(__dirname, 'build'),
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': '{}',
      process: {}
    })
  ],
  bail: true
};
