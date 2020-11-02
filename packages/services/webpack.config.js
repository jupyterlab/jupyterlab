const version = require('./package.json').version;

module.exports = {
  entry: './lib',
  output: {
    filename: './dist/index.js',
    library: '@jupyterlab/services',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    publicPath: 'https://unpkg.com/@jupyterlab/services@' + version + '/dist/'
  },
  resolve: {fallback: { path: require.resolve("path-browserify")} },
  bail: true,
  mode: 'production',
  devtool: 'source-map'
};
