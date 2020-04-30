const merge = require('webpack-merge');
const config = require('./webpack.prod.minimize.config');

config[0] = merge(config[0], {
  // Turn off source maps
  devtool: false
});

module.exports = config;
