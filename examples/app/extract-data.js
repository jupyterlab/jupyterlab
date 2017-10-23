var data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

var names = Object.keys(data.dependencies).filter(function(name) {
  var packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});

Build.ensureAssets({
  packageNames: names,
  output: './build'
});
