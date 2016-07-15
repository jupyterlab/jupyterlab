// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var fs = require('fs-extra');
fs.copySync('src/', 'lib/', { filter: /\.css$/ });
fs.copySync('src/', 'lib/', { filter: /\.svg$/ });
fs.copySync('src/', 'lib/', { filter: /\.gif$/ });
