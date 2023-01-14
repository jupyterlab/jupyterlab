/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// jest-raw-loader compatibility with Jest version 28.
// See: https://github.com/keplersj/jest-raw-loader/pull/239
module.exports = {
  process: (content: string): { code: string } => {
    return {
      code: 'module.exports = ' + JSON.stringify(content)
    };
  }
};
