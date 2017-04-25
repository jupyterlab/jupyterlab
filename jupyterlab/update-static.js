var fs = require('fs-extra');
var childProcess = require('child_process');
var path = require('path');


// Fill in the package template.
var source = './package.json';
var target = './package.template.json';
var data = require(source);
data['name'] = '@jupyterlab/application-top';
data['scripts'] = {
    'build': 'webpack'
};

// Use the npm package versions.
var packages = fs.readdirSync('../packages');
for (var i = 0; i < packages.length; i++) {
  var pkg = packages[i];
  var pkg_data = require(path.resolve('../packages', pkg, 'package.json'));
  var name = pkg_data.name;
  if (!data['dependencies'][name]) {
    continue;
  }
  var cmd = 'npm view ' + name + ' version';
  var specifier = childProcess.execSync(cmd);
  specifier = '^' + String(specifier).trim();
  console.log(name, specifier);
  data['dependencies'][name] = specifier;
}

// Copy the target file.
fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
