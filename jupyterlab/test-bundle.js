var MemoryFS = require("memory-fs");
var webpack = require("webpack");

var fs = new MemoryFS();
var compiler = webpack({
  entry: {
    loader: './loader'
  },
  output: {
    path: '/build',
    filename: '[name].bundle.js',
    publicPath: './lab',
    library: 'jupyterlab',
    libraryTarget: 'amd'
  },
  node: {
    fs: 'empty'
  },
  debug: true,
  bail: true,
  devtool: 'source-map'
});
compiler.outputFileSystem = fs;
compiler.run(function(err, stats) {
  var fileContent = fs.readFileSync(__dirname + '/build/loader.bundle.js',
    'utf8');
  console.log(fileContent);
});

// See http://stackoverflow.com/q/30343961 for how to generate sub-assets
// Kick off a promise for each one - override the entry and output and
// the memory fs
// see also https://github.com/ampedandwired/html-webpack-plugin/issues/171#issuecomment-171914278

// We need a base webpack config *somewhere* - keep in with this library.
// Users can use webpack-config for merging

