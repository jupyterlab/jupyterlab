var merge = require('webpack-merge');
var config = require('./webpack.prod.minimize.config');

config[0] = merge(config[0], {
  // Turn off source maps
  devtool: false
});

module.exports = config;
