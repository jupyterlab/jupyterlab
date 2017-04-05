
var fstream = require('fstream');
var fs = require('fs-extra');
var path = require('path');
var glob = require('glob');


// Get all of the packages.
var rootPath = path.resolve('.');
var rootPackage = require('./package.json');
var packages = new Map();
var outDir = path.resolve('./build');
fs.removeSync(outDir);
fs.ensureDir(outDir);

// Handle the packages starting at the root.
handlePackage(rootPath);


function handlePackage(basePath) {
    // Handle the package and its dependencies, recursively.
    var data = require(path.join(basePath, 'package.json'));
    var name = data.name + '@' + data.version;
    if (packages.has(name)) {
        return;
    }
    packages.set(name, data);
    for (let name in data.dependencies) {
        handlePackage(findPackage(basePath, name));
    }
    // Handle paths that are not in node_modules.
    var relPath = path.relative(rootPath, basePath);
    relPath = relPath.split('../').join('');
    if (relPath.indexOf('node_modules') !== 0) {
        return moveLocal(basePath, data, name);
    }
    // Handle others.
    movePackage(basePath, data, name);
}


function moveLocal(basePath, data, name) {
    // Move symlinked or root files using the package.json config.
    var destDir = path.join(outDir, 'node_modules', data.name);
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


function movePackage(basePath, data, name) {
    // Pull in the whole package except files that should be ignored.
    // List from  https://docs.npmjs.com/files/package.json#files

    function fileFilter(source, destination) {
      var localRel = path.relative(basePath, source);
      switch (localRel.split(path.sep).shift()) {
      case 'node_modules':
      case '.git':
      case 'CVS':
      case '.svn':
      case '.hg':
      case '.lock-wscript':
      case '.wafpickle-N':
      case '.DS_Store':
      case 'npm-debug.log':
      case '.npmrc':
      case 'node_modules':
      case 'config.gypi':
        return false;
      default:
        return true;
      }
    }

    var relPath = path.relative(rootPath, basePath);
    var dirDest = path.join(outDir, relPath.split('../').join(''));
    fs.ensureDir(dirDest);
    fs.copySync(basePath, dirDest, { filter: fileFilter });
}


function findPackage(basePath, name) {
    // Walk up the tree to the root path looking for the package.
    while (true) {
        var packagePath = path.join(basePath, 'node_modules', name);
        if (fs.existsSync(packagePath)) {
            return fs.realpathSync(packagePath);
        }
        basePath = path.resolve(basePath, '..');
    }
}
