// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare var define: any;

if (typeof define !== 'function') {
  // tslint:disable-next-line
  const define = require('amdefine')(module);
}

module.exports = {
  test: () => {
    return 1;
  },
  test2: () => {
    throw Error('Nope');
  }
};
