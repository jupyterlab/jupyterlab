var merge = require('webpack-merge');
var config = require('./webpack.config');

config[0] = merge(config[0], {
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    // As of terser-webpack-plugin@1.3.0,
    // the JupyterLab codebase plus its optional extensions is too big to be minified.
    // Even with sourceMap and mangling disabled. And even with `node --max_old_space_size=4096`.
    minimize: false
  }
});

module.exports = config;
