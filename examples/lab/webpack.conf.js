
module.exports = {
  entry: './index.js',
  output: {
    path: __dirname + "/build",
    filename: "bundle.js",
    publicPath: "./build/"
  },
  node: {
    fs: "empty"
  },
  debug: true,
  devtool: 'source-map',
  bail: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file' },
      // Handle image
      { test: /\.(jpg|png|gif|svg)$/, loader: "file" },
    ]
  }
}
