

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
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.html$/, loader: "file?name=[name].[ext]" }
    ]
  }
}
