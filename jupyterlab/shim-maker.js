// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var path = require('path');
var fs = require('fs');


/**
 * Create a shim to export all of a library's modules to a namespaced object.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder.
 *
 * @param regex - (RegExp) A regular expression used to match files.   The
 * default is all `.js` files.
 *
 * @returns A promise that resolves when the file is created.
 *
 * #### Notes
 * A `index.js` files will be explicitly included in an "index" key.
 * The `regex` has no effect on `index` files, which will always be included.
 */
function shimmer(modName, sourceFolder, regex) {
  var modPath = require.resolve(modName + '/package.json');
  sourceFolder = sourceFolder || 'lib';
  regex = regex || /.*\.js$/;
  modPath = path.join(path.dirname(modPath), sourceFolder);
  var lines = ['var ' + modName + ' = {}'];

  var entries = fs.readdirSync(modPath);
  // Algorithm:
  // search for index.js file
  // if one exists, use it, otherwise use an empty object to initialize
  // then, for each, if it is a directory, recurse-and-add
  // if it is a file that matches our regex, add it
  var lines = getLines(modName, sourceFolder, modPath, modPath, regex);
  lines.push('module.exports = ' + modName);
  return lines.join('\n');
}


/**
 * Get the appropriate shim lines for the items in a folder.
 */
function getLines(modName, sourceFolder, basePath, currentPath, regex) {
  var lines = [];
  var entries = fs.readdirSync(currentPath);
  var relPath = path.relative(basePath, currentPath);
  var parts = relPath.split('/');
  var modPath = path.join(modName, sourceFolder, relPath);

  // Initialize the object.
  // Check for base path.
  if (!parts[0]) {
    lines.push('var ' + modName + ' = {};');
  } else {
    lines.push(modName + '["' + parts.join('"]["') + '"] = {};');
  }
  if (entries.indexOf('index.js') !== -1) {
    // Check for base path.
    if (!parts[0]) {
      lines.push(modName + '["index"] = require("' + modPath + '");');
    } else {
      lines.push(modName + '["' + parts.join('"]["') + '"]["index"] = require("' + modPath + '");');
    }
  }
  // Otherwise, handle each file.
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    // Handle directories recursively.
    var isDirectory = fs.statSync(path.join(currentPath, entry)).isDirectory();
    if (isDirectory) {
      lines = lines.concat(getLines(modName, sourceFolder, basePath, path.join(currentPath, entry), regex));
    } else if (regex.test(entry)) {
      // Skip index files, already taken care of above.
      if (path.basename(entry) === 'index.js') {
        continue;
      }
      entry = entry.replace(path.extname(entry), '');
      var entryParts = parts.slice();
      entryParts.push(entry);
      if (!entryParts[0]) {
        entryParts = entryParts.slice(1);
      }
      lines.push(modName + '["' + entryParts.join('"]["') + '"] = require("' + path.join(modPath, entry) + '");');
    }
  }
  return lines;
}


module.exports = shimmer;
