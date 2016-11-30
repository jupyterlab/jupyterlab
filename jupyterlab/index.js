// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var JupyterLab = require('../lib/application').JupyterLab;

// ES6 Promise polyfill
require('es6-promise').polyfill();

require('font-awesome/css/font-awesome.min.css');
require('../lib/default-theme/index.css');

module.exports = new JupyterLab({
  version: require('../package.json').version,
  gitDescription: process.env.GIT_DESCRIPTION
});
