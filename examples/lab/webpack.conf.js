
module.exports = {
  entry: './example/build/index.js',
  output: {
    path: './example/build',
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['', '.js']
  },
  node: {
    fs: "empty"
  },
  bail: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  }
}
