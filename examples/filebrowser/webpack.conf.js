

module.exports = {
  entry: './build/index.js',
  output: {
    path: __dirname + "/build",
    filename: "bundle.js",
    publicPath: "./build/"
  },
  node: {
    fs: "empty"
  },
  bail: true,
  debug: true,
  devtool: 'inline-source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.html$/, loader: "file?name=[name].[ext]" }
      { test: /\.html$/, loader: 'file' },
      // Handle image
      { test: /\.(jpg|png|gif|svg)$/, loader: "file" },
    ]
  }
}