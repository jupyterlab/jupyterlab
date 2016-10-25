// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var buildExtension = require('@jupyterlab/extension-builder').buildExtension;
var path = require('path');


buildExtension({
  name: 'mockextension',
  entry: './mockextension/index.js',
  outputDir: './mockextension/build'
});
