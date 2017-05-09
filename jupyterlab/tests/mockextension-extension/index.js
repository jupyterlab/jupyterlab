// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var Widget = require('@phosphor/widgets').Widget;
var countCall = require('@jupyterlab/python-tests/util');

countCall('@jupyterlab/python-tests-extension loaded');


module.exports.default = {
  id: 'mockextension-extension',
  autoStart: true,
  activate: function(application) {
    countCall('@jupyterlab/python-tests-extension activated');
    var w = new Widget();
    w.title.label = 'Yet More Python Tests';
    w.id = 'id-jupyterlab-python-tests-plugin';
    application.shell.addToRightArea(w);
  }
};
