
var fstream = require('fstream');
var fs = require('fs-extra');
var path = require('path');
var childProcess = require('child_process');
var tar = require('tar');
var zlib = require('zlib');
var glob = require('glob');


// Get all of the packages.
var rootPath = path.resolve('.');
var rootPackage = require('./package.json');
var packages = new Map();
var outDir = path.join('./build', 'node_modules');
fs.ensureDir(outDir);
fs.remove(outDir);


// We want the tarball to be the name of the package, mangled.
// if (name[0] === '@') name = name.substr(1).replace(/\//g, '-')
// We pre-process to move the local source stuff back to the source dir libs.

// Then, we run this script which uses `files` to determine what to use
// if it is a symlink
getDependencies(rootPath);

// var tarFile = fs.createWriteStream('extension.tgz')
// tarFile.on('finish', function() {
//     console.log('Finished!')
// });
// fstream.Reader({ path: outDir, type: "Directory" })
//   .pipe(tar.Pack())
//   .pipe(zlib.createGzip())
//   .pipe(tarFile)



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
    // Handle paths that are not in node_modules.
    var relPath = path.relative(rootPath, basePath);
    relPath = relPath.split('../').join('');
    if (relPath.indexOf('node_modules') !== 0) {
        return moveLocal(basePath, data, name);
    }
    // Handle others.
    moveFolder(basePath, data, name);
}



function moveLocal(basePath, data, name) {
    // Move symlinked or root files using the package.json config.
    var destDir = path.join(outDir, data.name);
    if (basePath === rootPath) {
        destDir = outDir;
    }
    fs.ensureDir(destDir);
    var seen = new Set();
    var seenDir = new Set();
    data.files = data.files || [];
    data.files.forEach(function(pattern) {
        var files = glob.sync(pattern, { cwd: basePath });
        // Move these files.
        files.forEach(function(fname) {
            var source = path.join(basePath, fname);
            if (seen.has(source)) {
                return;
            }
            seen.add(source);
            var target = path.join(destDir, fname);
            var targetDir = path.dirname(target);
            if (!seenDir.has(targetDir)) {
                fs.ensureDir(targetDir);
            }
            seenDir.add(targetDir);
            fs.copySync(source, path.join(destDir, fname));
        })
    });
    // Make sure we have the main entry point.
    if (data.main) {
        var source = path.join(basePath, data.main);
        if (!seen.has(source)) {
            var target = path.join(destDir, data.main);
            fs.ensureDir(path.dirname(target));
            fs.copySync(source, path.join(destDir, data.main));
        }
    }
    var packagePath = path.join(destDir, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(data, null, 2) + '\n');
}


function moveFolder(basePath, data, name) {
    return;
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
            return getDependencies(fs.realpathSync(packagePath));
        }
        basePath = path.resolve(basePath, '..');
    }

}
