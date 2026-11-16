// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const IMiddleToken = require('./tokens').IMiddleToken;

module.exports = [
  {
    id: '@jupyterlab/example-federated-middle',
    autoStart: true,
    provides: IMiddleToken,
    activate: function (app) {
      console.log('JupyterLab extension middle is activated!');
      console.log(app.commands);
      // Read content fetched without options, so that the example test can
      // check that the deprecation warning names each prebuilt extension.
      void app.serviceManager.contents.get('').then(model => model.content);
      return 'hello';
    }
  }
];
