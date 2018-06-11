var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

var cpus = require('os').cpus().length;
var forkCheckerCpus = cpus > 2 ? 2 : 1;
var threadCpus = cpus - forkCheckerCpus;

// Use sourcemaps if in watch or debug mode;
var devtool = 'eval';
if (process.argv.indexOf('--watch') !== -1) {
  devtool = 'cheap-module-eval-sourcemap';
}

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  bail: true,
  devtool: devtool,
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      workers: forkCheckerCpus,
      checkSyntacticErrors: true
    })
  ],
  module: {
    rules: [
      { test: /\.tsx?$/, use: [
        { loader: 'cache-loader' },
        { loader: 'thread-loader', options: {workers: threadCpus} },
        { loader: 'ts-loader', options: {happyPackMode: true} },
      ]},
      { test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        // eslint-disable-next-line no-undef
        exclude: /node_modules/
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.csv$/, use: 'raw-loader' },
      { test: /\.ipynb$/, use: 'json-loader' },
      { test: /\.html$/, use: 'file-loader' },
      { test: /\.md$/, use: 'raw-loader' },
      { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
      { test: /\.js.map$/, use: 'file-loader' },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader?limit=10000&mimetype=image/svg+xml' },
    ]
  },
};
