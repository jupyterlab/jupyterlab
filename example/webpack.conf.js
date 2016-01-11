
module.exports = {
  entry: './example/build/index.js',
  output: {
    path: './example/build',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
    ]
  }
}
