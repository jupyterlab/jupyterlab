var path = require('path');

module.exports = {
  entry: './test/src/index.ts',
  output: {
    path: __dirname + "/build",
    filename: "bundle.js",
    publicPath: "./test/build/"
  },
  bail: true,
  devtool: 'inline-source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.md$/, loader: 'raw-loader'},
      { test: /\.html$/, loader: 'file-loader?name=[name].[ext]' },
      { test: /\.ipynb$/, loader: 'json-loader' },
      { test: /\.json$/, loader: 'json-loader' },
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        query: {
          tsconfig: './test/src/tsconfig.json'
        }
      }
    ]
  },
  resolve: {
    // Add '.ts' as resolvable extensions.
    extensions: ['', '.webpack.js', '.web.js', '.js', '.ts']
  }
}
