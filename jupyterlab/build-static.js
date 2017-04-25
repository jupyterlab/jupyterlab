var fs = require('fs-extra');

// Copy the templates.
fs.copySync('./package.template.json', './static/package.json')
fs.copySync('./webpack.config.js', './static/webpack.config.js')
fs.copySync('./index.template.js', './static/index.template.js')
