var path = require('path');

module.exports = {
  entry: './test/build/index.js',
  output: {
    path: __dirname + "/build",
    filename: "bundle.js",
    publicPath: "./build/"
  },
  bail: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ],
  }
}
