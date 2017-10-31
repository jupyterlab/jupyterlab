// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var Widget = require('@phosphor/widgets').Widget;

var renderer = {
  mimeTypes = ['text/plain'],

  canRender: function (options) {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  },

  render: function (options) {
    return new Widget();
  },

  wouldSanitize: function (options) {
    return false;
  }
};


module.exports = {
  mimeType: 'text/plain',
  renderer: renderer,
  widgetFactoryOptions: {
    name: 'Test',
    fileExtensions: ['.txt'],
    readOnly: true
  }
}
