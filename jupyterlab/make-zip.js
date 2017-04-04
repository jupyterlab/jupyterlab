
var fstream = require('fstream');
var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');
var tar = require('tar');
var zlib = require('zlib');


// Get all of the packages.
var rootPath = path.resolve('.');
var packages = new Map();
var outDir = fs.mkdtempSync('/tmp/jupyterlab');
getDependencies(rootPath);

var tarFile = fs.createWriteStream('extension.tgz')
tarFile.on('finish', function() {
    console.log('Finished!')
});
fstream.Reader({ path: outDir, type: "Directory" })
  .pipe(tar.Pack())
  .pipe(zlib.createGzip())
  .pipe(tarFile)



function getDependencies(basePath) {
    var data = require(path.join(basePath, 'package.json'));
    var name = data.name + '@' + data.version;
    if (packages.has(name)) {
        return;
    }
    packages.set(name, data);
    for (let name in data.dependencies) {
        getDependency(basePath, name);
    }
    moveFolder(basePath, data, name);
}



function moveLocal(basePath, data, name) {
    var srcDir = data.name.replace('@jupyterlab', './build/packages') + '/src';
    var destDir = path.join(outDir, 'node_modules', data.name);
    fs.ensureDir(destDir);
    if (fs.existsSync(srcDir)) {
        fs.copySync(srcDir, path.join(destDir, 'lib'));
    }
    var styleDir = path.join(basePath, 'style');
    if (fs.existsSync(styleDir)) {
        fs.copySync(styleDir, path.join(destDir, 'style'));
    }
    var packagePath = path.join(destDir, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(data, null, 2) + '\n');
}




function moveFolder(basePath, data, name) {
    // Pull in the whole package except .git and node_modules
    var relPath = path.relative(rootPath, basePath);
    if (relPath.indexOf('../packages') === 0) {
        return moveLocal(basePath, data, name);
    }
    if (relPath.indexOf('../node_modules') === 0) {
        relPath = relPath.slice(3);
    }
    var dirDest = path.join(outDir, relPath);
    fs.ensureDir(dirDest);

    function fileFilter(source, destination) {
      var localRel = path.relative(basePath, source);
      if (localRel.indexOf('node_modules') !== -1) {
        return false;
      }
      if (localRel.indexOf('.git') !== -1) {
        return false;
      }
      return true;
    }

    fs.copySync(basePath, dirDest, { filter: fileFilter });
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






