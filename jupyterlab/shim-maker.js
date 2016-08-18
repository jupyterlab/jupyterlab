// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var walkSync = require('walk-sync');


/**
 * Create a shim to export all of a library's modules to a namespaced object.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder (defaults to `lib`).
 *
 * @returns The code used to export the entire package.
 */
function shimmer(modName, sourceFolder) {
  var dirs = [];
  var files = [];
  var lines = [];

  // Find the path to the module.
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  modPath = path.join(path.dirname(modPath), sourceFolder);

  // Walk through the source tree.
  var entries = walkSync.entries(modPath);
  for (var i = 0; i < entries.length; i++) {
    // Get the relative path to the entry.
    var entry = entries[i];
    var entryPath = path.join(entry.basePath, entry.relativePath);
    entryPath = path.relative(modPath, entryPath);
    // Add an empty object for each directory path.
    if (entry.isDirectory()) {
      var parts = entryPath.split('/');
      if (parts[0]) {
        dirs.push(modName + '["' + parts.join('"]["') + '"] = {};');
      }
    // Add an import for each JavaScript file.
    } else if (path.extname(entryPath) === '.js') {
      entryPath = entryPath.replace('.js', '');
      var parts = entryPath.split('/');
      files.push(modName + '["' + parts.join('"]["') + '"] = require("' + path.join(modName, sourceFolder, entryPath) + '");');
    // Add CSS imports.
    } else if (path.extname(entryPath) === '.css') {
      var parts = entryPath.split('/');
      files.push(modName + '["' + parts.join('"]["') + '"] = require("' + path.join(modName, sourceFolder, entryPath) + '");');
    }
  }
  // Assemble the code to export the modules.
  lines.push('var ' + modName + ' = {};');
  lines = lines.concat(dirs);
  lines = lines.concat(files);
  lines.push('module.exports = ' + modName + ';');

  return lines.join('\n');
}


module.exports = shimmer;
