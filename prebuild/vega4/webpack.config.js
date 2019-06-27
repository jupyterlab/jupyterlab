var path = require('path');

module.exports = {
  entry: 'vega-embed',
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(
      __dirname,
      '..',
      '..',
      'packages',
      'vega4-extension',
      'lib'
    ),
    filename: 'built-vega-embed.js',
    libraryTarget: 'commonjs2'
  }
};
