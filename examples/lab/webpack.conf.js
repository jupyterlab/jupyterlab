
module.exports = {
  entry: './example/index.ts',
  output: {
    path: './example/build',
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['', '.ts', '.js']
  },
  node: {
    fs: "empty"
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ]
  }
}
