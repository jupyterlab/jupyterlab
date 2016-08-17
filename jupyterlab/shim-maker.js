var path = require('path');
var fs = require('fs');
var walkSync = require('walk-sync');


/**
 * Generate a shim for a library that does not have top level indexes.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder.
 *
 * @param indexOnly (boolean) - Whether to only shim index files.
 *  (default is False).
 *
 * @returns A promise that resolves when the file is created.
 */
function shimmer(modName, sourceFolder, indexOnly) {
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  indexOnly = !!indexOnly;
  modPath = path.join(path.dirname(modPath), sourceFolder);
  var entries = walkSync.entries(modPath);
  var lines = ['var ' + modName + ' = {}'];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var basePath  = path.join(entry.basePath, entry.relativePath);
    var entryPath = path.relative(modPath, basePath);
    if (entry.isDirectory()) {
      var parts = entryPath.split('/');
      lines.push(modName + '["' + parts.join('"]["') + '"] = {};')
    } else if (path.extname(entryPath) === '.js') {
      entryPath = entryPath.replace('.js', '');
      if (path.basename(entryPath) === 'index') {
        entryPath = path.dirname(entryPath);
      } else if (indexOnly) {
        continue;
      }
      parts = entryPath.split('/');
      if (parts[0]) {
       lines.push(modName + '["' + parts.join('"]["') + '"] = require("' + path.join(modName, sourceFolder, entryPath) + '");');
      }
    }
  }
  lines.push('module.exports = ' + modName + ';')
  return lines.join('\n');
}


module.exports = shimmer;
