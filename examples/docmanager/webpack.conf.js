
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
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  },
  plugins: [
    new ContextReplacementPlugin(
      /codemirror\/mode.*$/,
      /codemirror\/mode.*\.js$/
    )
  ]
}
