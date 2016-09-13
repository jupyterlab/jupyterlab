// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var buildExtension = require('jupyterlab-extension-builder').buildExtension;
var path = require('path');


buildExtension({
  name: 'mockextension',
  entryPath: './mockextension/index.js',
  config: {
    output: {
      path: path.join(process.cwd(), 'mockextension', 'build'),
    }
  }
});
