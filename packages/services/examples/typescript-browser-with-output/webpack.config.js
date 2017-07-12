
module.exports = {
  entry: './build/index.js',
  output: {
    filename: './build/bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      }
    ]
  },
  bail: true
}
