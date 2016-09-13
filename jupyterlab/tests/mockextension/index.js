// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

module.exports = [
{
  id: 'mockextension',
  autoStart: true,
  activate: function(application) {
    window.commands = application.commands;
  }
}
]
