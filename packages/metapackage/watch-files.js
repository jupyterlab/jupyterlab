// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var fs = require('fs-extra');
var path = require('path');
var watch = require('watch');


// Handle a change to a file.
function handleFile(filename) {
  var name = path.basename(filename);
  var parts = filename.split(path.sep);
  parts[0] = '..';
  parts[2] = 'lib';
  target = path.resolve(parts.join(path.sep));
  fs.copySync(filename, target);
}

// Watch the files in lib.
watch.createMonitor('lib', function (monitor) {
  monitor.on("created", function (f, curr, prev) {
    watch.createMonitor(f, function (submonitor) {
      submonitor.on("changed", handleFile);
    });
  });
  monitor.on("changed", handleFile);

  // Handle the initial files.
  require('./build');

  console.log('Watching the metapackage files...');
});
