// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';
// Distributed under the terms of the Modified BSD License.

declare let define: any;

if (typeof define !== 'function') {
  // @ts-ignore
  const define = require('amdefine')(module); // eslint-disable-line
}

module.exports = {
  test: () => {
    return 1;
  },
  test2: () => {
    throw Error('Nope');
  }
};
