// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var fs = require('fs-extra');
var path = require('path');
var watch = require('watch');

fs.ensureDirSync('lib');


function handleChanged(f, curr, prev) {
    var name = path.basename(f);
    var package = f.split(path.sep)[1];
    var target = path.join('..', package, 'lib', name);
    target = path.resolve(target);
    fs.copySync(f, target);
}

watch.createMonitor('lib', function (monitor) {
    monitor.on("created", function (f, curr, prev) {
        watch.createMonitor(f, function (submonitor) {
            submonitor.on("changed", handleChanged);
        });
    });
    monitor.on("changed", handleChanged);
})
