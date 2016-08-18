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
  var lines = ['var ' + modName + ' = {};'];

  // Find the path to the module.
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  modPath = path.join(path.dirname(modPath), sourceFolder);

  // Walk through the source tree.
  var entries = walkSync.entries(modPath, {
    directories: false,
    globs: ['**/*.js', '**/*.css']
  });
  for (var i = 0; i < entries.length; i++) {
    // Get the relative path to the entry.
    var entryPath = entries[i].relativePath;
    // Add an entries for each file.
    lines.push(modName + '["' + entryPath + '"] = require("' + path.join(modName, sourceFolder, entryPath) + '");');
  }
  lines.push('module.exports = ' + modName + ';');

  return lines.join('\n');
}


module.exports = shimmer;
