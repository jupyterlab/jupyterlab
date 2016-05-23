var path = require('path');

module.exports = {
  entry: './test/build/index.js',
  output: {
    path: __dirname + "/build",
    filename: "coverage.js",
    publicPath: "./build/"
  },
  bail: true,
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.ipynb$/, loader: 'json-loader' },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
    ],
    preLoaders: [
      // instrument only testing sources with Istanbul
      {
        test: /\.js$/,
        include: path.resolve('lib/'),
        loader: 'istanbul-instrumenter'
      }
    ]
  }
}
