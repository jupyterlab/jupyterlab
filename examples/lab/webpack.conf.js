
module.exports = {
  entry: './example/index.js',
  output: {
    path: './example/build',
    filename: 'bundle.js'
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
    ]
  },
    externals: {
      "base/js/namespace": "base/js/namespace",
      "notebook/js/outputarea": "notebook/js/outputarea",
      "services/kernels/comm": "services/kernels/comm"
  }
}
