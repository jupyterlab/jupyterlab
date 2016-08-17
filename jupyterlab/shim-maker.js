var path = require('path');
var fs = require('fs');


/**
 * Generate a shim for a library that does not have top level indexes.
 *
 * @param modName (string) - The name of the module to shim.
 *
 * @param sourceFolder (string) - The source folder.
 *
 * @param indexOnly (boolean) - Whether to only shim index files.
 *
 * @returns A promise that resolves when the file is created.
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

  // Initialize with the index file if available, else an empty object.
  if (entries.indexOf('index.js') !== -1) {
    if (!parts[0]) {
      lines.push('var ' + modName + ' = require("' + modPath + '");');
    } else {
      lines.push(modName + '["' + parts.join('"]["') + '"] = require("' + modPath + '");');
    }
  } else {
    if (!parts[0]) {
      lines.push('var ' + modName + ' = {};');
    } else {
      lines.push(modName + '["' + parts.join('"]["') + '"] = {};');
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
      // Skip index files, already taken care of.
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
