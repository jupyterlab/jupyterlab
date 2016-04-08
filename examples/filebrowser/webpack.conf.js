
var ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");

module.exports = {
  entry: './build/index.js',
  output: {
    path: './build',
    filename: 'bundle.js'
  },
  node: {
    fs: "empty"
  },
  bail: true,
  debug: true,
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.html$/, loader: "file?name=[name].[ext]" }
    ]
  }
}
