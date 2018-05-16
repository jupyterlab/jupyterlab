var path = require('path');
// `CheckerPlugin` is optional. Use it if you want async error reporting.
// We need this plugin to detect a `--watch` mode. It may be removed later
// after https://github.com/webpack/webpack/issues/3460 will be resolved.
var CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;


// Use sourcemaps if in watch or debug mode;
var devtool = 'eval';
if (process.argv.indexOf('--watch') !== -1) {
  devtool = 'cheap-module-eval-sourcemap';
}

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  bail: true,
  devtool: devtool,
  plugins: [
    new CheckerPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'awesome-typescript-loader',
            query: {
              sourceMap: false,
              inlineSourceMap: true,
              compilerOptions: {
                removeComments: true
              }
            }
          }
        ]
      },
      { test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        // eslint-disable-next-line no-undef
        exclude: path.join(process.cwd(), 'node_modules')
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.csv$/, use: 'raw-loader' },
      { test: /\.(json|ipynb)$/, use: 'json-loader' },
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
