// Use sourcemaps if in watch or debug mode;
const devtool =
  process.argv.indexOf('--watch') !== -1 ||
  process.argv.indexOf('--debug') !== -1
    ? 'source-map-inline'
    : 'eval';

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  bail: true,
  devtool: devtool,
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'ts-loader', options: { context: process.cwd() } }]
      },
      {
        test: /\.js$/,
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
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: 'url-loader?limit=10000&mimetype=application/octet-stream'
      },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
      {
        // In .css files, svg is loaded as a data URI.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: { test: /\.css$/ },
        use: {
          loader: 'svg-url-loader',
          options: { encoding: 'none', limit: 10000 }
        }
      },
      {
        // In .ts and .tsx files (both of which compile to .js), svg files
        // must be loaded as a raw string instead of data URIs.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: { test: /\.js$/ },
        use: {
          loader: 'raw-loader'
        }
      }
    ]
  }
};
