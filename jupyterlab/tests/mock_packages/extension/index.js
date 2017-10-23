// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

module.exports = [{
  id: 'mockextension',
  requires: [
    require('@jupyterlab/launcher').ILauncher,
  ],
  autoStart: true,
  activate: function(application, launcher) {
    // eslint-disable-next-line no-console
    console.log('mock extension activated', launcher);
    window.commands = application.commands;
  }
}];
