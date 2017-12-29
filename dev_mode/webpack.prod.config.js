

var config = require('./webpack.config');

config.devtool = 'source-map';

// Add the uglify plugin and define production.

module.exports = config;
