
var path = require('path');
var fs = require('fs');

/**
 * Generate a shim for a library that does not have top level indexes.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder (default is `/lib`).
 *
 * @returns The code for a shim module.
 */
function shimmer(modName, sourceFolder) {
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  modPath = path.join(path.dirname(modPath), sourceFolder);
  var paths = [];
  var dirNames = [];

  var walk = require('walk');
  var walker = walk.walk(modPath);
  var fullPath;
  var lines = [];

  walker.on("file", function (root, fileStats, next) {
    if (path.extname(fileStats.name) !== '.js') {
      next();
      return;
    }
    fullPath = path.join(root, fileStats.name.replace('.js', ''));
    paths.push(path.relative(modPath, fullPath));
    next();
  });

  walker.on("directory", function (root, dirStats, next) {
    fullPath = path.join(root, dirStats.name)
    dirNames.push(path.relative(modPath, fullPath));
    next();
  });

   walker.on("end", function () {
    // Lets write the code.
    lines.push('var ' + modName + ' = { };');
    for (var i = 0; i < dirNames.length; i++) {
      lines.push(modName + '["' + dirNames[i] + '"] = {};')
    }
    for (var i = 0; i < paths.length; i++) {
      parts = paths[i].split('/');
      lines.push(modName + '["' + parts[0] + '"]["' + parts[1] + '"] = require("' + path.join(modName, sourceFolder, paths[i]) + '");')
    }
    lines.push('module.exports = ' + modName + ';');
    var code = lines.join('\n');
    fs.writeFile(modName + '-shim.js', code, function(err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    }); 
  });
}


shimmer('phosphor');
