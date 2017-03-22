
var fs = require('fs');
var path = require('path');


// Get all of the packages.
var rootPath = path.resolve('.');
var packages = new Map();
getDependencies(rootPath);


function getDependencies(basePath) {
    var data = require(path.join(basePath, 'package.json'));
    var name = data.name + '@' + data.version;
    if (packages.has(name)) {
        return;
    }
    packages.set(name, { name: data.name, version: data.version,
                         dependencies: data.dependencies,
                         jupyterlab: data.jupyterlab });
    for (let name in data.dependencies) {
        getDependency(basePath, name);
    }
}


function getDependency(basePath, name) {
    // Walk up the tree to the root path looking for the package.
    while (true) {
        if (fs.existsSync(path.join(basePath, 'node_modules', name))) {
            var realPath = fs.realpathSync(path.join(basePath, 'node_modules', name));
            return getDependencies(realPath);
        }
        basePath = path.resolve(basePath, '..');
    }
}


// Write the file back to disk.
fs.writeFileSync('./depdata.json', JSON.stringify([...packages], null, 2) + '\n');
