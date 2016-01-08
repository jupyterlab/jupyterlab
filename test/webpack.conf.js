var path = require('path');

module.exports = {
  entry: './test/build/index.js',
  output: {
    filename: './test/build/bundle.js'
  },
  bail: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ],
  }
}
