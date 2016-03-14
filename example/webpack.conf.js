
module.exports = {
  entry: './build/index.js',
  output: {
    filename: './build/bundle.js',
    chunkFilename: "./build/[id].bundle.js"
  },
  debug: true,
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.json$/, loader: 'json-loader' },
    ]
  }
}
