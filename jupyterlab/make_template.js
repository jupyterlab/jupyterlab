var childProcess = require('child_process');
var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var Handlebars = require('handlebars');
var crypto = require('crypto');
var package_data = require('./package.json');


/** take a pre-populated package.json and generate an index.out.js */
function makeTemplate(){
  fs.ensureDirSync('./build');

  // Create the entry point file.
  var source = fs.readFileSync('index.template.js').toString();
  var template = Handlebars.compile(source);
  var data = { jupyterlab_extensions: package_data.jupyterlab.extensions };
  var result = template(data);
  fs.writeFileSync('build/index.out.js', result);


  // Create the hash
  var hash = crypto.createHash('md5');
  hash.update(fs.readFileSync('./package.json'));
  fs.writeFileSync('build/hash.md5', hash.digest('hex'));
}

module.exports = makeTemplate;
