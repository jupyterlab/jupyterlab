var path = require('path');

module.exports = {
  entry: './build/index.js',
  output: {
    path: __dirname + "/build",
    filename: "coverage.js",
    devtoolModuleFilenameTemplate: '[resource-path]'
  },
  bail: true,
  devtool: 'source-map',
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.md$/, use: 'raw-loader'},
      { test: /\.html$/, use: 'file-loader?name=[name].[ext]' },
      { test: /\.ipynb$/, use: 'json-loader' },
      { test: /\.json$/, use: 'json-loader' },
      {
        enforce: 'pre',
        test: /\.js$/,
        include: path.resolve('node_modules/@jupyterlab'),
        use: 'istanbul-instrumenter'
      }
    ],
  }
}
