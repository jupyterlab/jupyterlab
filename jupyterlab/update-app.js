var data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

let names = Object.keys(data.jupyterlab.extensions).filter(function(name) {
  packageData = require(name + '/package.json');
  return packageData.jupyterlab !== undefined;
});
Build.ensureAssets({
  packageDirectories: names,
  output: '..'
});
