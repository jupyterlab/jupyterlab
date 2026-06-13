// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var baseConfig = require('./playwright.config');

module.exports = {
  ...baseConfig,
  projects: [
    {
      name: 'csp',
      testMatch: 'test/csp/**'
    }
  ],
  webServer: {
    command: 'jupyter lab --config ./jupyter_server_csp_test_config.py',
    url: 'http://127.0.0.1:8888/lab',
    reuseExistingServer: false,
    timeout: 360000
  }
};
