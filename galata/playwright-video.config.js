// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const config = require('./playwright.config');

module.exports = {
  ...config,
  // Differentiate this run from the baseline run in merged blob reports.
  tag: '@modified-tests-video',
  // Keep replay artifacts isolated from the primary run assets.
  outputDir: 'test-results-replay',
  use: {
    ...(config.use ?? {}),
    video: 'on'
  },
  // Keep generated video assets for passing tests.
  preserveOutput: 'always'
};
