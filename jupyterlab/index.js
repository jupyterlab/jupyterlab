// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('jupyterlab/lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('material-design-icons/iconfont/material-icons.css');
require('jupyterlab/lib/default-theme/index.css');

var lab = new JupyterLab();

lab.registerPlugins(jupyter.plugins);

window.onload = function() { lab.start(); }
