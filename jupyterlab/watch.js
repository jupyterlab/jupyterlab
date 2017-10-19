var watch = require('watch');
var path = require('path');
var fs = require('fs-extra');


/**
 * Watch a package for changes and copy them to the local node_modules.
 */
function watchPackage(packagePath) {
  var data = require(path.join(packagePath, 'package.json'));
  var targetBase = require.resolve(path.join(data.name, 'package.json'));
  targetBase = path.dirname(targetBase);

  var filter = function(f, stat) {
    return f.split(path.sep).indexOf('node_modules') === -1;
  }
  var options = {
    "ignoreDotFiles": true,
    "filter": filter,
    "interval": 1
  }

  watch.watchTree(packagePath, options, function (f, curr, prev) {
    if (typeof f !== 'object' && curr !== null) {
      var target = path.join(targetBase, f.slice(packagePath.length));
      if (f === target) {
        return;
      }
      if (curr.nlink === 0) {
        fs.removeSync(target);
      } else {
        fs.copySync(f, target);
      }
    }
  });
}


// Get the linked package paths an watch them.
var jlab = require('./package.json').jupyterlab;
var linkedPackages = {};
Object.keys(jlab.linkedPackages).forEach(function (name) {
  watchPackage(fs.realpathSync(jlab.linkedPackages[name]));
});

watchPackage(fs.realpathSync('../packages/console'))
