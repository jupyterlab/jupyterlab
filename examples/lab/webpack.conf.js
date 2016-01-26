
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
      // jquery-ui loads some images
      { test: /\.(jpg|png|gif)$/, loader: "file" },
      // required to load font-awesome
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/font-woff" },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/font-woff" },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=application/octet-stream" },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&minetype=image/svg+xml" }

    ]
  },
    externals: {
      "base/js/namespace": "base/js/namespace",
      "notebook/js/outputarea": "notebook/js/outputarea",
      "services/kernels/comm": "services/kernels/comm"
  }
}
