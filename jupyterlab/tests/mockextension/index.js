// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
console.log('@jupyterlab/python-tests in build');

var Widget = require('@phosphor/widgets').Widget;

module.exports.default = {
  id: 'mockextension',
  autoStart: true,
  activate: function(application) {
    console.log('@jupyterlab/python-tests activated');
    var w = new Widget();
    w.title.label = 'Python Tests';
    w.id = 'id-jupyterlab-python-tests';
    application.shell.addToRightArea(w);
  }
};
