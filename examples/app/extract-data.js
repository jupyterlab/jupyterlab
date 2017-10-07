var path = require('path');
var data = require('./package.json');
var Build = require('@jupyterlab/buildutils').Build;

var basePath = path.resolve('.');
var directories = [];
Object.keys(data.dependencies).forEach(function(name) {
  packagePath = path.join(basePath, 'node_modules', name);
  packageData = require(path.join(packagePath, 'package.json'));
  if (packageData.jupyterlab !== undefined) {
    directories.push(packagePath);
  }
});
Build.ensureAssets({
  packageDirectories: directories,
  output: './build'
});
