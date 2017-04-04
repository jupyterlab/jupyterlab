
var fstream = require('fstream');
var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');
var tar = require('tar');


// Get all of the packages.
var rootPath = path.resolve('.');
var packages = new Map();
var outDir = fs.mkdtempSync('/tmp/jupyterlab');
var stageDir = path.join(outDir, 'stage');
fs.mkdirSync(stageDir);
getDependencies(rootPath);


function getDependencies(basePath) {
    var data = require(path.join(basePath, 'package.json'));
    var name = data.name + '@' + data.version;
    if (packages.has(name)) {
        return;
    }
    packages.set(name, data);
    moveFolder(basePath, data, name);
    for (let name in data.dependencies) {
        getDependency(basePath, name);
    }
}


function moveFolder(basePath, data, name) {
    // Pull in the whole package except .git and node_modules
    var relPath = path.relative(basePath, rootPath);
    debugger;
    // var dirDest = fs.createWriteStream(path.join(outDir, fname));

    // function filter(entry) {
    //   switch (entry.basename) {
    //   case '.git':
    //   case 'node_modules':
    //     return false;
    //   default:
    //     return true;
    //   }
    // }

    // var reader = new fstream.DirReader({
    //     path: path.join(outDir, fname), type: 'Directory',
    //     Directory: true, filter: filter })
    //   .pipe(dirDest)
}


function getDependency(basePath, name) {
    // Walk up the tree to the root path looking for the package.
    while (true) {
        var packagePath = path.join(basePath, 'node_modules', name);
        if (fs.existsSync(packagePath)) {
            var realPath = fs.realpathSync(packagePath);
            return getDependencies(realPath);
        }
        basePath = path.resolve(basePath, '..');
    }

}






