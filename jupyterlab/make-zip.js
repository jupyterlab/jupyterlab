
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
debugger;

function getDependencies(basePath) {
    var data = require(path.join(basePath, 'package.json'));
    var name = data.name + '@' + data.version;
    if (packages.has(name)) {
        return;
    }
    packages.set(name, data);
    packFolder(basePath, data, name);
    for (let name in data.dependencies) {
        getDependency(basePath, name);
    }
}


function packFolder(basePath, data, name) {
    // Pull in the whole package except .git and node_modules
    fs.copySync(basePath, stageDir);
    prune(path.join(stageDir, 'node_modules'));
    prune(path.join(stageDir, '.git'));
    if (name[0] === '@') name = name.substr(1).replace(/\//g, '-')
    var fname = name + '.tgz';
    var dirDest = fs.createWriteStream(path.join(outDir, fname));

    function f (entry) {
      return entry.basename !== '.git' && entry.basename !== 'node_modules';
    }

    var reader = new fstream.DirReader({
        path: path.join(outDir, fname), type: 'Directory',
        Directory: true, filter: f })
      .pipe(tar.Pack())
      .pipe(dirDest)
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






