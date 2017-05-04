// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
console.log('@jupyterlab/python-tests in build');

module.exports.default = {
  id: 'mockextension',
  autoStart: true,
  activate: function(application) {
    console.log('@jupyterlab/python-tests activated');
    window.commands = application.commands;
  }
};
