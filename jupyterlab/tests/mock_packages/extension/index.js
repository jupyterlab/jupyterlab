// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

module.exports = [
  {
    id: 'mockextension',
    requires: [
      require('@jupyterlab/launcher').ILauncher,
    ],
    autoStart: true,
    activate: function(application, launcher) {
      console.log('mock extension activated')
      window.commands = application.commands;
    }
  },
]
