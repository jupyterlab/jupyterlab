// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var fs = require('fs-extra');
var path = require('path');
var watch = require('watch');

fs.ensureDirSync('lib');

watch.watchTree('lib', function (f, curr, prev) {
    if (curr && curr.nlink > 0) {
        var name = path.basename(f);
        var package = f.split(path.sep)[1];
        var target = path.join('..', package, 'lib', name);
        target = path.resolve(target);
        fs.copySync(f, target);
    }
})
