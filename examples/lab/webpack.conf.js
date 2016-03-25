
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
  bail: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'file' },
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: "file" }
    ]
  }
}
